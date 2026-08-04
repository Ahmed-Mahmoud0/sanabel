"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";

export function ResetPasswordForm() {
  const t = useTranslations("Auth.resetPassword");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(!token ? t("invalidTokenError") : null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError(t("invalidTokenError"));
      return;
    }
    setPending(true);
    setError(null);

    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (resetError) {
        setError(t("invalidTokenError"));
        return;
      }
      setSuccess(true);
    } catch {
      setError(t("invalidTokenError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-lg border border-border-hairline bg-surface-raised p-gutter">
      <h1 className="text-heading-lg text-text-primary">{t("title")}</h1>

      {success ? (
        <div className="mt-6 flex flex-col gap-4">
          <FormMessage tone="success">{t("success")}</FormMessage>
          <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("signInLink")}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Field
            id="password"
            label={t("passwordLabel")}
            type="password"
            autoComplete="new-password"
            placeholder={t("passwordPlaceholder")}
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && <FormMessage tone="error">{error}</FormMessage>}

          <Button type="submit" disabled={pending || !token} className="mt-2 w-full">
            {pending ? t("submitting") : t("submit")}
          </Button>
        </form>
      )}
    </div>
  );
}
