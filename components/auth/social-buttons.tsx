"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getPathname } from "@/lib/i18n/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/auth/form-message";
import { GoogleIcon } from "@/components/auth/icons/google";
import { GithubIcon } from "@/components/auth/icons/github";

export function SocialButtons({
  errorCallbackPath,
}: {
  errorCallbackPath: "/sign-in" | "/sign-up";
}) {
  const t = useTranslations("Auth.social");
  const locale = useLocale();

  const [pendingProvider, setPendingProvider] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signInWithProvider(provider: "google" | "github") {
    setPendingProvider(provider);
    setError(null);

    try {
      const { error: signInError } = await authClient.signIn.social({
        provider,
        callbackURL: getPathname({ href: "/my-learning", locale }),
        errorCallbackURL: getPathname({ href: errorCallbackPath, locale }),
      });

      if (signInError) {
        setError(t("genericError"));
        setPendingProvider(null);
      }
      // On success, Better Auth's redirect plugin navigates the page away —
      // leave `pendingProvider` set so the buttons stay disabled until then.
    } catch {
      setError(t("genericError"));
      setPendingProvider(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-hairline" />
        <span className="text-body-sm text-text-secondary">{t("or")}</span>
        <div className="h-px flex-1 bg-border-hairline" />
      </div>

      {error && <FormMessage tone="error">{error}</FormMessage>}

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        disabled={pendingProvider !== null}
        onClick={() => signInWithProvider("google")}
      >
        <GoogleIcon className="size-4" />
        {t("continueWithGoogle")}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        disabled={pendingProvider !== null}
        onClick={() => signInWithProvider("github")}
      >
        <GithubIcon className="size-4" />
        {t("continueWithGithub")}
      </Button>
    </div>
  );
}
