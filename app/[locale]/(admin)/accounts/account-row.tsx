"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/auth/form-message";
import { actionErrorText } from "@/lib/actions/result";
import { setInstructorRoleAction } from "@/lib/modules/accounts/actions";
import type { AccountSummary } from "@/lib/modules/accounts/service";

// Client leaf for one account row: renders the current role badges and a
// Grant / Revoke Instructor button wired to the Server Action. On success the
// action's `revalidatePath` re-renders this list server-side in the same
// response, so the row comes back with its new role state — no manual refresh.
// A failure is surfaced inline through the shared FormMessage.
export function AccountRow({ account }: { account: AccountSummary }) {
  const t = useTranslations("Admin.accounts");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const willGrant = !account.isInstructor;

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await setInstructorRoleAction(account.id, willGrant);
        if (!result.ok) {
          setError(
            actionErrorText(
              result.error.code,
              {
                forbidden: t("errorForbidden"),
                not_found: t("errorNotFound"),
              },
              t("errorGeneric"),
            ),
          );
        }
      } catch {
        // The action itself never throws, but the dispatch can reject — a
        // dropped connection, or a stale action id after a deploy. Surface it
        // inline as a retry path rather than letting it hit the error boundary.
        setError(t("errorGeneric"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body-sm font-medium text-text-primary">
            {account.name}
          </span>
          <span className="truncate text-body-sm text-text-secondary">
            {account.email}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant="outline">{t("roleLearner")}</Badge>
          {account.isInstructor && (
            <Badge variant="secondary">{t("roleInstructor")}</Badge>
          )}
          {account.isAdmin && <Badge>{t("roleAdmin")}</Badge>}
        </div>

        <Button
          type="button"
          size="sm"
          variant={willGrant ? "default" : "destructive"}
          disabled={isPending}
          onClick={handleClick}
          aria-label={
            willGrant
              ? t("grantAria", { email: account.email })
              : t("revokeAria", { email: account.email })
          }
        >
          {isPending
            ? t("pending")
            : willGrant
              ? t("grant")
              : t("revoke")}
        </Button>
      </div>

      {error && <FormMessage tone="error">{error}</FormMessage>}
    </div>
  );
}
