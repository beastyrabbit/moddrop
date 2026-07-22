CREATE TYPE "public"."youtube_policy" AS ENUM('disabled', 'preview_only', 'allow_on_air');--> statement-breakpoint
CREATE TABLE "canvas_documents" (
	"room_id" uuid PRIMARY KEY NOT NULL,
	"snapshot" jsonb NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_members" (
	"room_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_members_room_id_clerk_user_id_pk" PRIMARY KEY("room_id","clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_clerk_id" text NOT NULL,
	"twitch_channel" text,
	"youtube_policy" "youtube_policy" DEFAULT 'preview_only' NOT NULL,
	"youtube_risk_acknowledged_at" timestamp with time zone,
	"obs_secret" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_owner_clerk_id_unique" UNIQUE("owner_clerk_id")
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"room_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"object_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uploads_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
ALTER TABLE "canvas_documents" ADD CONSTRAINT "canvas_documents_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "room_members_user_idx" ON "room_members" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "rooms_obs_secret_idx" ON "rooms" USING btree ("obs_secret");--> statement-breakpoint
CREATE INDEX "uploads_room_id_idx" ON "uploads" USING btree ("room_id");