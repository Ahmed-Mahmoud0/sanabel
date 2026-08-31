import { redirect } from "@/lib/i18n/navigation";
import { getSessionUser } from "@/lib/auth/authorization";

// Learner surfaces need authentication, not a role flag — every signed-in
// account holds the Learner role by default (AC #5). Send signed-out visitors
// to sign-in rather than showing a 404.
export default async function LearnerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getSessionUser();

  if (!user) {
    redirect({ href: "/sign-in", locale });
  }

  return <>{children}</>;
}
