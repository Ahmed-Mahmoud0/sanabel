"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import {
  clearLocaleSwitchFormState,
  useLocaleSwitchFormState,
} from "@/lib/i18n/locale-switch-form-state";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";

export function ForgotPasswordForm() {
  const t = useTranslations("Auth.forgotPassword");
  const locale = useLocale();

  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Preserve the typed email across a language switch (AC #2).
  useLocaleSwitchFormState("form:forgot-password", {
    email: { value: email, set: setEmail },
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const { error: requestError } = await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: `/${locale}/reset-password`,
      });

      if (requestError) {
        setError(t("genericError"));
        return;
      }
      clearLocaleSwitchFormState("form:forgot-password");
      setSent(true);
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

      {sent ? (
        <div className="mt-6 flex flex-col gap-4">
          <FormMessage tone="success">{t("success")}</FormMessage>
          <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("backToSignIn")}
          </Link>
        </div>
      ) : (
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

          {error && <FormMessage tone="error">{error}</FormMessage>}

          <Button type="submit" disabled={pending} className="mt-2 w-full">
            {pending ? t("submitting") : t("submit")}
          </Button>
        </form>
      )}
    </div>
  );
}
