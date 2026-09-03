import { OutlineEditorSkeleton } from "@/components/course/outline/outline-editor-skeleton";

// Next.js route-level loading UI: renders instantly on navigation to the
// course builder while the Server Component awaits `getCourseOutline` (AC #5).
export default function Loading() {
  return <OutlineEditorSkeleton />;
}
