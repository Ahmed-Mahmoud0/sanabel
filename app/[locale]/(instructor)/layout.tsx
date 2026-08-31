import { notFound } from "next/navigation";
import { can } from "@/lib/auth/authorization";

// Route-level guard for every Instructor-only surface (AC #2). Blocks
// direct-URL access regardless of what the nav renders. A guard here — a
// Server Component with a DB-backed session read — rather than in proxy.ts,
// which only does locale routing and can't do the round-trip.
export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await can("instructor"))) {
    notFound();
  }

  return <>{children}</>;
}
