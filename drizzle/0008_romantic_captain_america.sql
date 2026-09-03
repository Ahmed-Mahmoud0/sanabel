ALTER TYPE "public"."course_category" ADD VALUE 'rpa' BEFORE 'other';--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_module_position_uq" ON "lesson" USING btree ("module_id","position") WHERE "lesson"."removed_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "module_course_position_uq" ON "module" USING btree ("course_id","position") WHERE "module"."removed_at" is null;