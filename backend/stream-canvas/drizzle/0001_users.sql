CREATE TABLE "users" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"username_search" text NOT NULL,
	"show_profile_pic" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_search_unique" UNIQUE("username_search")
);
--> statement-breakpoint
CREATE INDEX "users_username_search_prefix_idx" ON "users" USING btree ("username_search" text_pattern_ops);