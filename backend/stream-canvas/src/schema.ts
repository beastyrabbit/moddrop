import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const youtubePolicy = pgEnum("youtube_policy", [
  "disabled",
  "preview_only",
  "allow_on_air",
]);

/** One room per streamer. Clerk remains the identity authority. */
export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey(),
    ownerClerkId: text("owner_clerk_id").notNull().unique(),
    twitchChannel: text("twitch_channel"),
    youtubePolicy: youtubePolicy("youtube_policy")
      .notNull()
      .default("preview_only"),
    youtubeRiskAcknowledgedAt: timestamp("youtube_risk_acknowledged_at", {
      withTimezone: true,
    }),
    /** Hashed long-lived credential used to mint short-lived OBS tickets. */
    obsSecret: text("obs_secret").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("rooms_obs_secret_idx").on(table.obsSecret)],
);

/** Editors invited to a room. The owner is stored on the room itself. */
export const roomMembers = pgTable(
  "room_members",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.roomId, table.clerkUserId] }),
    index("room_members_user_idx").on(table.clerkUserId),
  ],
);

/** Latest authoritative tldraw sync snapshot for a room. */
export const canvasDocuments = pgTable("canvas_documents", {
  roomId: uuid("room_id")
    .primaryKey()
    .references(() => rooms.id, { onDelete: "cascade" }),
  snapshot: jsonb("snapshot").notNull(),
  schemaVersion: integer("schema_version").notNull().default(1),
  revision: bigint("revision", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Metadata for room assets. Object bytes live in Garage or the dev adapter. */
export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id").primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    objectKey: text("object_key").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("uploads_room_id_idx").on(table.roomId)],
);

export type YouTubePolicy = (typeof youtubePolicy.enumValues)[number];
