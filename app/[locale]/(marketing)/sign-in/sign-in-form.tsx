"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OAuthErrorMessage } from "@/components/auth/oauth-error-message";
import { SocialButtons } from "@/components/auth/social-buttons";

export function SignInForm() {
  const t = useTranslations("Auth.signIn");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError(t("invalidCredentialsError"));
        return;
      }

      router.push("/my-learning");
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-lg border border-border-hairline bg-surface-raised p-gutter">
      <h1 className="text-heading-lg text-text-primary">{t("title")}</h1>
      <p className="mt-1 text-body-sm text-text-secondary">{t("subtitle")}</p>

      <Suspense fallback={null}>
        <OAuthErrorMessage />
      </Suspense>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Field
          id="email"
          label={t("emailLabel")}
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Field
          id="password"
          label={t("passwordLabel")}
          type="password"
          autoComplete="current-password"
          placeholder={t("passwordPlaceholder")}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <Link
          href="/forgot-password"
          className="self-start text-body-sm text-primary underline-offset-4 hover:underline"
        >
          {t("forgotPassword")}
        </Link>

        {error && <FormMessage tone="error">{error}</FormMessage>}

        <Button type="submit" disabled={pending} className="mt-2 w-full">
          {pending ? t("submitting") : t("submit")}
        </Button>
      </form>

      <div className="mt-6">
        <SocialButtons errorCallbackPath="/sign-in" />
      </div>

      <p className="mt-4 text-body-sm text-text-secondary">
        {t("noAccount")}{" "}
        <Link href="/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("signUpLink")}
        </Link>
      </p>
    </div>
  );
}
