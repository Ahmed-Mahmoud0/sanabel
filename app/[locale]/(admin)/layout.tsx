import { notFound } from "next/navigation";
import { can } from "@/lib/auth/authorization";

// Route-level guard for every Admin-only surface (AC #2). Blocks direct-URL
// access regardless of what the nav renders. Admin does NOT imply Instructor
// (AD-6) — this only checks the `isAdmin` flag; the Instructor group has its
// own independent guard.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await can("admin"))) {
    notFound();
  }

  return <>{children}</>;
}
