import { setRequestLocale } from "next-intl/server";
import { SignUpForm } from "./sign-up-form";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex flex-1 items-center justify-center bg-surface-base p-gutter">
      <SignUpForm />
    </main>
  );
}
