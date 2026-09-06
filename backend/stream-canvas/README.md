# Stream canvas backend

The stream canvas backend is the authoritative home for rooms, collaboration,
canvas snapshots, OBS access, and uploaded asset metadata. Convex remains the
app-facing scaffold; these real-time records live in PostgreSQL because every
backend replica must see the same state.

## Data model

- `rooms` stores one room per Clerk owner, its Twitch channel, owner-selected
  YouTube policy, and a one-way hash of the OBS bootstrap secret.
- `room_members` stores invited Clerk users as normalized rows. Membership is
  checked on every editor token and upload request.
- `canvas_documents` stores the latest tldraw room snapshot as JSONB with a
  revision. The active WebSocket leader writes updates here, so a replacement
  pod can recover the same canvas.
- `uploads` stores file metadata and the S3/Garage object key. File bytes never
  live in PostgreSQL.

Drizzle owns the schema in `src/schema.ts`. Generated SQL in `drizzle/` is the
only production migration path. `src/migrate.ts` takes a PostgreSQL advisory
lock before applying migrations, which makes concurrent deployment jobs safe.
The WebSocket service uses a separate advisory lock so only one process accepts
live room connections. Kubernetes uses a stop/flush/start handover for this
process; PostgreSQL, Garage, and the three frontend replicas remain independent
of it.

## Local database

```bash
docker compose -f compose.dev.yml up -d postgres
cp backend/stream-canvas/.env.example backend/stream-canvas/.env
pnpm --dir backend/stream-canvas run db:migrate
pnpm run dev:canvas
```

Local uploads use the filesystem adapter. Production requires
`OBJECT_STORAGE_MODE=s3`; Garage keeps the bytes independent of any pod.

## Legacy SQLite cutover

`src/import-legacy-sqlite.ts` is an offline cutover importer. It normalizes
room members, preserves or upgrades hashed OBS secrets, converts tldraw's
per-room tables into JSONB snapshots, and copies uploaded bytes into the active
object store. The Kubernetes cutover runbook keeps the old PVC read-only until
the PostgreSQL counts and application behavior have been verified.

Stop both old and new canvas services before importing. Keep a backup of the
source and target. Repeating the import against the same frozen source is safe
only before the new service accepts edits: it replaces canvas snapshots and
re-adds legacy memberships. Never rerun it against a live target or after users
have changed the imported canvas or access list. Validate counts, memberships,
and representative uploads before opening the new service to users.

## Live sessions and persistence

Removing a collaborator closes their existing editor sessions when the settings
transaction commits. Regenerating the OBS URL closes current OBS sessions and
invalidates previously minted WebSocket tickets. Other editors stay connected.
An already issued upload URL remains valid until its configured expiry, normally
one hour. Downloaded bytes cannot be recalled.

These guarantees apply to the leader serving the application HTTP routes.
The production HTTP middleware rejects standby requests with 503 and
`Retry-After: 2`, independently of ingress readiness routing. Deployments must
still drain HTTP requests on the old process before starting its successor,
as part of the stop/flush/start handover. A request admitted before demotion
can otherwise finish its database transaction after the old sessions close;
configuration notifications are process-local, not a cross-replica event bus.

The service sends committed Twitch and YouTube settings over existing WebSockets.
Official clients apply them on receipt, without a manual refresh or polling.
This requires an open, functioning connection; a reconnect receives current
settings again.

Snapshot changes are coalesced for 100 ms before constructing the full JSONB
snapshot. A flush on idle disposal or voluntary shutdown bypasses that delay.
This adds at most 100 ms before starting a normal write, plus database latency;
an abrupt crash can lose uncommitted edits. Reconnection waits for an idle
room's final write. Failed idle flushes retain the authoritative room for retry.

Snapshot writes run on the same PostgreSQL connection that owns the advisory
lock. On involuntary connection loss the service immediately stops admission,
closes sessions, and discards uncommitted in-memory changes rather than writing
them over a successor's state. Voluntary shutdown retains the lock until flush
finishes. Failed flushes are reported as failures, including a nonzero shutdown
exit. Service database statements have a 10-second deadline, readiness has a 3-second
deadline, and shutdown has a 25-second deadline. Configure the external
orchestrator's termination grace period to at least 30 seconds.
Migration and offline import commands use a separate pool without statement or
client query deadlines, so lock waits and long DDL are not cut off by request
limits. Bound those maintenance jobs with the deployment job's timeout instead.
The live snapshot writer retains the service deadline; investigate repeated
write timeouts as an operational failure rather than assuming those edits are durable.

## Upload retention

Uploads remain stored for the lifetime of their room. Removing a shape does not
delete its media because undo, duplicate shapes, and restored snapshots may
still refer to it. Account for storage with `sum(uploads.size)` grouped by
`room_id`; compare this with object-store usage to find untracked objects.

Cleanup is an offline maintenance operation, not an automatic shape-deletion
side effect. Back up room metadata and snapshots, stop writers, inventory current
and retained-backup references, and quarantine confirmed unreferenced objects
for at least 30 days before deleting bytes and their metadata. Keep undo history
and backup restores within that grace period or extend it. No live uploads are
deleted by this change.

## Verification

GitHub verification runs on the homelab `arc-moddrop` Docker-backed runner.
The pinned Node Bookworm container runs as root so Playwright can install browser
dependencies; PostgreSQL is an isolated service container. Release tags run this
same gate before deploying Convex and publishing both images to GHCR. Manual
publication is restricted to `main`. The Forgejo workflow is retained as a legacy
copy; its `personal` runner pool was retired on 2026-08-31.

After a release succeeds, update all three image references in the Homelab
Moddrop HelmRelease to the released tag and verified GHCR digests. Commit through
the Homelab GitOps workflow, reconcile Flux, and verify frontend and backend
readiness plus the public application. Cluster access is available through SSH
on `bunux`. Backend rollout uses Recreate so the old leader flushes and exits
before the new leader admits sessions.

`pnpm run test` runs fast route and lifecycle unit tests and tears down its
temporary storage and pools. Set `CANVAS_TEST_DATABASE_URL` to a disposable
PostgreSQL database to include the migration-backed WebSocket lifecycle group.
Never point it at an application database. CI provisions its own PostgreSQL
service and also runs the isolated editor-to-OBS browser flow.

Both compiler packages are intentional. `@typescript/native` supplies the
`tsc` command; the `typescript` alias supplies the TypeScript 6 JavaScript API
used by framework tooling and exposes `tsc6`. Removing the former leaves the
existing check and build commands without a compiler.

The current Minio release still includes advisory matches in
`decode-uri-component` and `stream-json`. Used object-store operations do not
decode query strings or invoke JSON filter/notification processing. Their fixes
require incompatible transitive upgrades; keep Minio updates enabled rather
than forcing those majors. Hono, Tiptap, and Nanoid are updated to patched
compatible versions.

## Changing the schema

1. Update `src/schema.ts`.
2. Run `pnpm --dir backend/stream-canvas run db:generate`.
3. Review the generated SQL and test it against PostgreSQL.
4. Deploy the migration before the new application pods become ready.
