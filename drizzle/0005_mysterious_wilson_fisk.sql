CREATE TYPE "public"."course_category" AS ENUM('programming-fundamentals', 'web-development', 'data-science', 'mobile-development', 'devops-cloud', 'computer-science', 'other');--> statement-breakpoint
CREATE TYPE "public"."course_content_language" AS ENUM('en', 'ar');--> statement-breakpoint
CREATE TABLE "course" (
	"id" text PRIMARY KEY NOT NULL,
	"instructor_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" "course_category" NOT NULL,
	"content_language" "course_content_language" NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course" ADD CONSTRAINT "course_instructor_id_user_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_instructor_id_idx" ON "course" USING btree ("instructor_id");