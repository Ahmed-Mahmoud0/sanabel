import { LessonEditorSkeleton } from "@/components/course/lesson/lesson-editor-skeleton";

// Renders instantly on navigation while the Server Component awaits
// `getLessonEditorData`.
export default function Loading() {
  return <LessonEditorSkeleton />;
}
