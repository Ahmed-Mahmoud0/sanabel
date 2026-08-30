"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { FormMessage } from "@/components/auth/form-message";

export function OAuthErrorMessage() {
  const t = useTranslations("Auth.social");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const code = searchParams.get("error");

  if (!code) return null;

  // On /sign-in itself, "Sign in" would be a no-op dead-end — the message's
  // own copy already tells the user to use the password field right below.
  const showSignInLink = code === "account_not_linked" && pathname !== "/sign-in";

  return (
    <div className="mt-4">
      <FormMessage tone="error">
        {code === "account_not_linked" ? (
          showSignInLink ? (
            <>
              {t("accountNotLinkedError")}{" "}
              <Link href="/sign-in" className="font-medium underline underline-offset-4">
                {t("signInLink")}
              </Link>
            </>
          ) : (
            t("accountNotLinkedError")
          )
        ) : (
          t("genericError")
        )}
      </FormMessage>
    </div>
  );
}
