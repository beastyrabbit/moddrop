import { readFile } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { RoomSnapshot } from "@tldraw/sync-core";
import { closeDatabase, db } from "./db.ts";
import { objectStore } from "./object-store.ts";
import { hashObsSecret, isHashedObsSecret } from "./obs-secret.ts";
import { canvasDocuments, roomMembers, rooms, uploads } from "./schema.ts";
import { streamCanvasSchema } from "./tldraw-schema.ts";

interface LegacyRoom {
  id: string;
  owner_clerk_id: string;
  twitch_channel: string | null;
  obs_secret: string;
  allowed_users: string | null;
  created_at: number | null;
  updated_at: number | null;
}

interface LegacyUpload {
  id: string;
  room_id: string;
  filename: string;
  mime_type: string;
  size: number;
  path: string;
  created_at: number | null;
}

interface LegacyDocument {
  state: Uint8Array;
  lastChangedClock: number;
}

interface LegacyTombstone {
  id: string;
  clock: number;
}

interface LegacyMetadata {
  documentClock: number;
  tombstoneHistoryStartsAtClock: number;
}

const legacyDatabasePath =
  process.env.LEGACY_DATABASE_PATH ?? "/legacy-data/stream-canvas.db";
const legacyDataDir = process.env.LEGACY_DATA_DIR ?? "/legacy-data";
const sqlite = new DatabaseSync(legacyDatabasePath, { readOnly: true });
const decoder = new TextDecoder();

let importedRooms = 0;
let importedDocuments = 0;
let importedUploads = 0;

try {
  await objectStore.check();
  const legacyRooms = sqlite
    .prepare("SELECT * FROM rooms")
    .all() as unknown as LegacyRoom[];

  for (const room of legacyRooms) {
    await db
      .insert(rooms)
      .values({
        id: room.id,
        ownerClerkId: room.owner_clerk_id,
        twitchChannel: room.twitch_channel,
        obsSecret: isHashedObsSecret(room.obs_secret)
          ? room.obs_secret
          : hashObsSecret(room.obs_secret),
        createdAt: timestamp(room.created_at),
        updatedAt: timestamp(room.updated_at),
      })
      .onConflictDoNothing();

    const members = parseMembers(room.allowed_users).filter(
      (clerkUserId) => clerkUserId !== room.owner_clerk_id,
    );
    if (members.length > 0) {
      await db
        .insert(roomMembers)
        .values(
          members.map((clerkUserId) => ({ roomId: room.id, clerkUserId })),
        )
        .onConflictDoNothing();
    }

    const snapshot = readLegacySnapshot(room.id);
    if (snapshot) {
      await db
        .insert(canvasDocuments)
        .values({
          roomId: room.id,
          snapshot,
          revision: snapshot.documentClock,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: canvasDocuments.roomId,
          set: {
            snapshot,
            revision: snapshot.documentClock,
            updatedAt: new Date(),
          },
        });
      importedDocuments += 1;
    }
    importedRooms += 1;
  }

  const legacyUploads = sqlite
    .prepare("SELECT * FROM uploads")
    .all() as unknown as LegacyUpload[];
  for (const upload of legacyUploads) {
    const sourcePath = resolveLegacyUploadPath(upload.path);
    const bytes = await readFile(sourcePath);
    const objectKey = `${upload.room_id}/${upload.id}-${basename(upload.filename)}`;
    await objectStore.put(objectKey, bytes, upload.mime_type);
    await db
      .insert(uploads)
      .values({
        id: upload.id,
        roomId: upload.room_id,
        filename: upload.filename,
        mimeType: upload.mime_type,
        size: upload.size,
        objectKey,
        createdAt: timestamp(upload.created_at),
      })
      .onConflictDoNothing();
    importedUploads += 1;
  }

  console.log(
    `[legacy-import] imported ${importedRooms} rooms, ${importedDocuments} canvas snapshots, and ${importedUploads} uploads`,
  );
} finally {
  sqlite.close();
  await closeDatabase();
}

// tldraw's schema runtime can retain background handles. This is a one-shot
// command, and all durable work plus both database closes have completed here.
process.exit(0);

function readLegacySnapshot(roomId: string): RoomSnapshot | null {
  const prefix = `tl_${roomId.replaceAll("-", "_")}_`;
  if (!tableExists(`${prefix}metadata`)) return null;

  const metadata = sqlite
    .prepare(
      `SELECT documentClock, tombstoneHistoryStartsAtClock FROM ${prefix}metadata LIMIT 1`,
    )
    .get() as unknown as LegacyMetadata | undefined;
  if (!metadata) return null;

  const documents = sqlite
    .prepare(`SELECT state, lastChangedClock FROM ${prefix}documents`)
    .all() as unknown as LegacyDocument[];
  const tombstones = sqlite
    .prepare(`SELECT id, clock FROM ${prefix}tombstones`)
    .all() as unknown as LegacyTombstone[];

  return {
    documentClock: metadata.documentClock,
    tombstoneHistoryStartsAtClock: metadata.tombstoneHistoryStartsAtClock,
    documents: documents.map((document) => ({
      state: sanitizeLegacyRecord(JSON.parse(decoder.decode(document.state))),
      lastChangedClock: document.lastChangedClock,
    })),
    tombstones: Object.fromEntries(
      tombstones.map((tombstone) => [tombstone.id, tombstone.clock]),
    ),
    schema: streamCanvasSchema.serialize(),
  } as RoomSnapshot;
}

function sanitizeLegacyRecord(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  if (
    record.typeName !== "shape" ||
    (record.type !== "youtube-embed" && record.type !== "audio-player") ||
    !record.props ||
    typeof record.props !== "object"
  ) {
    return value;
  }
  const props = { ...(record.props as Record<string, unknown>) };
  delete props.editorAudioEnabled;
  return { ...record, props };
}

function tableExists(name: string): boolean {
  return Boolean(
    sqlite
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
      )
      .get(name),
  );
}

function parseMembers(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((member): member is string => typeof member === "string")
      : [];
  } catch {
    return [];
  }
}

function resolveLegacyUploadPath(storedPath: string): string {
  const relativePath = storedPath.startsWith("/data/")
    ? storedPath.slice("/data/".length)
    : storedPath.startsWith("data/")
      ? storedPath.slice("data/".length)
      : isAbsolute(storedPath)
        ? join("uploads", basename(storedPath))
        : storedPath;
  const resolvedRoot = resolve(legacyDataDir);
  const resolvedPath = resolve(resolvedRoot, relativePath);
  if (relative(resolvedRoot, resolvedPath).startsWith("..")) {
    throw new Error("Legacy upload path escapes the mounted data directory");
  }
  return resolvedPath;
}

function timestamp(value: number | null): Date {
  return value === null ? new Date() : new Date(value);
}
