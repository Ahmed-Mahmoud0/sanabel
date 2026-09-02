"use client";

import { Suspense, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import {
  clearLocaleSwitchFormState,
  useLocaleSwitchFormState,
} from "@/lib/i18n/locale-switch-form-state";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OAuthErrorMessage } from "@/components/auth/oauth-error-message";
import { SocialButtons } from "@/components/auth/social-buttons";

export function SignUpForm() {
  const t = useTranslations("Auth.signUp");
  const locale = useLocale();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ duplicate: boolean; message: string } | null>(null);

  // Keep the non-sensitive fields across a language switch (AC #2). Password
  // is intentionally excluded — never mirrored to storage.
  useLocaleSwitchFormState("form:sign-up", {
    name: { value: name, set: setName },
    email: { value: email, set: setEmail },
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const { error: signUpError } = await authClient.signUp.email({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        callbackURL: `/${locale}`,
      });

      if (signUpError) {
        if (signUpError.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
          setError({ duplicate: true, message: t("duplicateEmailError") });
        } else {
          setError({ duplicate: false, message: t("genericError") });
        }
        return;
      }

      clearLocaleSwitchFormState("form:sign-up");
      router.push("/my-learning");
      router.refresh();
    } catch {
      setError({ duplicate: false, message: t("genericError") });
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
          id="name"
          label={t("nameLabel")}
          type="text"
          autoComplete="name"
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
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
          autoComplete="new-password"
          placeholder={t("passwordPlaceholder")}
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error && (
          <FormMessage tone="error">
            {error.message}
            {error.duplicate && (
              <>
                {" "}
                <Link href="/sign-in" className="font-medium underline underline-offset-4">
                  {t("signInLink")}
                </Link>
              </>
            )}
          </FormMessage>
        )}

        <Button type="submit" disabled={pending} className="mt-2 w-full">
          {pending ? t("submitting") : t("submit")}
        </Button>
      </form>

      <div className="mt-6">
        <SocialButtons errorCallbackPath="/sign-up" />
      </div>

      <p className="mt-4 text-body-sm text-text-secondary">
        {t("haveAccount")}{" "}
        <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("signInLink")}
        </Link>
      </p>
    </div>
  );
}
