CREATE TYPE "public"."lesson_media_kind" AS ENUM('video', 'pdf');--> statement-breakpoint
CREATE TYPE "public"."lesson_media_status" AS ENUM('queued', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "lesson_media" (
	"id" text PRIMARY KEY NOT NULL,
	"lesson_id" text NOT NULL,
	"kind" "lesson_media_kind" NOT NULL,
	"status" "lesson_media_status" DEFAULT 'queued' NOT NULL,
	"provider_asset_id" text,
	"size_bytes" bigint,
	"reserved_duration_seconds" integer NOT NULL,
	"duration_seconds" integer,
	"error_reason" text,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lesson" ADD COLUMN "content_body" jsonb;--> statement-breakpoint
ALTER TABLE "lesson_media" ADD CONSTRAINT "lesson_media_lesson_id_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lesson"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lesson_media_lesson_id_idx" ON "lesson_media" USING btree ("lesson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_media_lesson_id_uq" ON "lesson_media" USING btree ("lesson_id") WHERE "lesson_media"."removed_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_media_provider_asset_id_uq" ON "lesson_media" USING btree ("provider_asset_id") WHERE "lesson_media"."provider_asset_id" is not null;