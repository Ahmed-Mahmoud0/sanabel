import { routing } from "@/lib/i18n/routing";

type Locale = (typeof routing.locales)[number];

function isLocale(value: string | undefined): value is Locale {
  return !!value && (routing.locales as readonly string[]).includes(value);
}

// Prefers the NEXT_LOCALE cookie (set by next-intl's proxy on every request,
// always sent same-origin regardless of referrer-policy) over the Referer
// header (fragile — stripped by some browsers/extensions, absent for non-
// browser callers). Wrapped in try/catch since `request` is a raw Fetch API
// Request from Better Auth's callback, not guaranteed to behave exactly like
// one in every invocation path.
export function getLocaleFromRequest(request?: Request): Locale {
  try {
    const cookieHeader = request?.headers.get("cookie");
    const cookieLocale = cookieHeader?.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/)?.[1];
    if (isLocale(cookieLocale)) {
      return cookieLocale;
    }

    const referer = request?.headers.get("referer");
    if (referer) {
      const segment = new URL(referer).pathname.split("/")[1];
      if (isLocale(segment)) {
        return segment;
      }
    }
  } catch {
    // non-standard headers object or malformed referer — fall through to default locale
  }
  return routing.defaultLocale;
}
