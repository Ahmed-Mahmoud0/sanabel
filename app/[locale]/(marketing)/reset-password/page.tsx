import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex flex-1 items-center justify-center bg-surface-base p-gutter">
      <Suspense fallback={<ResetPasswordFallback />}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}

function ResetPasswordFallback() {
  return (
    <div
      className="h-[220px] w-full max-w-sm animate-pulse rounded-lg border border-border-hairline bg-surface-raised p-gutter"
      aria-hidden="true"
    />
  );
}
