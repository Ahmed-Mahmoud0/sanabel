"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { FormMessage } from "@/components/auth/form-message";

export function OAuthErrorMessage() {
  const t = useTranslations("Auth.social");
  const searchParams = useSearchParams();
  const code = searchParams.get("error");

  if (!code) return null;

  return (
    <div className="mt-4">
      <FormMessage tone="error">
        {code === "account_not_linked" ? (
          <>
            {t("accountNotLinkedError")}{" "}
            <Link href="/sign-in" className="font-medium underline underline-offset-4">
              {t("signInLink")}
            </Link>
          </>
        ) : (
          t("genericError")
        )}
      </FormMessage>
    </div>
  );
}
