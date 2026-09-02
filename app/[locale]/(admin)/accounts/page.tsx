import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { can } from "@/lib/auth/authorization";
import { listAccounts } from "@/lib/modules/accounts/service";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { AccountRow } from "./account-row";

export default async function AdminAccountsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Defense in depth. The (admin) route-group layout already guards this via
  // `can("admin")` -> `notFound()`, but layouts don't re-run on client-side
  // navigation between sibling admin routes. Same convention as
  // (admin)/moderation/page.tsx. Admin does NOT imply Instructor (AD-6).
  if (!(await can("admin"))) {
    notFound();
  }

  const t = await getTranslations("Admin.accounts");
  const { q } = await searchParams;
  // `searchParams` values are `string | string[] | undefined` — a repeated `?q=`
  // key arrives as an array. Take the first entry so `.trim()` never blows up.
  const rawQuery = Array.isArray(q) ? q[0] : q;
  const query = rawQuery?.trim() ?? "";
  const accounts = await listAccounts({ query });

  return (
    <main className="mx-auto w-full max-w-3xl px-gutter py-8">
      <h1 className="text-heading-lg text-text-primary">{t("title")}</h1>
      <p className="mt-1 text-body-sm text-text-secondary">{t("subtitle")}</p>

      {/* Plain GET form — no client JS needed for search, matches the
          small-launch-scale conventions used elsewhere (no search service). */}
      <form method="get" className="mt-6 flex items-end gap-2">
        <div className="flex-1">
          <Field
            id="q"
            name="q"
            type="search"
            label={t("searchLabel")}
            placeholder={t("searchPlaceholder")}
            defaultValue={query}
          />
        </div>
        <Button type="submit" variant="outline">
          {t("searchSubmit")}
        </Button>
      </form>

      {accounts.length === 0 ? (
        <p className="mt-6 text-body-sm text-text-secondary">
          {query ? t("noResults", { query }) : t("empty")}
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-border-hairline overflow-hidden rounded-lg border border-border-hairline">
          {accounts.map((account) => (
            <li key={account.id}>
              <AccountRow account={account} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
