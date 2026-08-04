import { setRequestLocale } from "next-intl/server";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex flex-1 items-center justify-center bg-surface-base p-gutter">
      <SignInForm />
    </main>
  );
}
