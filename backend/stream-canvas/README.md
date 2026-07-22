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

`src/import-legacy-sqlite.ts` is the idempotent one-time importer. It normalizes
room members, preserves or upgrades hashed OBS secrets, converts tldraw's
per-room tables into JSONB snapshots, and copies uploaded bytes into the active
object store. The Kubernetes cutover runbook keeps the old PVC read-only until
the PostgreSQL counts and application behavior have been verified.

## Changing the schema

1. Update `src/schema.ts`.
2. Run `pnpm --dir backend/stream-canvas run db:generate`.
3. Review the generated SQL and test it against PostgreSQL.
4. Deploy the migration before the new application pods become ready.
