"use client";

import { useLocale, useTranslations } from "next-intl";
import { getPathname } from "@/lib/i18n/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/auth/icons/google";
import { GithubIcon } from "@/components/auth/icons/github";

export function SocialButtons({
  errorCallbackPath,
}: {
  errorCallbackPath: "/sign-in" | "/sign-up";
}) {
  const t = useTranslations("Auth.social");
  const locale = useLocale();

  function signInWithProvider(provider: "google" | "github") {
    authClient.signIn.social({
      provider,
      callbackURL: getPathname({ href: "/my-learning", locale }),
      errorCallbackURL: getPathname({ href: errorCallbackPath, locale }),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-hairline" />
        <span className="text-body-sm text-text-secondary">{t("or")}</span>
        <div className="h-px flex-1 bg-border-hairline" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={() => signInWithProvider("google")}
      >
        <GoogleIcon className="size-4" />
        {t("continueWithGoogle")}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={() => signInWithProvider("github")}
      >
        <GithubIcon className="size-4" />
        {t("continueWithGithub")}
      </Button>
    </div>
  );
}
