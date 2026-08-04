// @react-email/render is a runtime peer dependency of Resend's `react:` send
// option (dynamically imported inside the SDK, never imported directly here)
// — keep it listed as a direct dependency or Resend throws "Failed to render
// React component" at send time.
import { Resend } from "resend";
import VerifyEmail from "@/emails/verify-email";
import ResetPasswordEmail from "@/emails/reset-password";
import en from "@/lib/i18n/en.json";
import ar from "@/lib/i18n/ar.json";

type Locale = "en" | "ar";

// Lazily constructed: Resend's constructor throws on a missing/empty key,
// which would otherwise crash Next.js's route page-data collection at build
// time (it imports this module without ever calling the send functions).
let resendClient: Resend | undefined;
function getResend() {
  return (resendClient ??= new Resend(process.env.RESEND_API_KEY));
}

const from = process.env.EMAIL_FROM || "Sanabel <onboarding@resend.dev>";
const subjects = { en: en.Auth.emails, ar: ar.Auth.emails };

export async function sendVerificationEmail(to: string, url: string, locale: Locale) {
  await getResend().emails.send({
    from,
    to,
    subject: subjects[locale].verify.subject,
    react: <VerifyEmail url={url} locale={locale} />,
  });
}

export async function sendResetPasswordEmail(to: string, url: string, locale: Locale) {
  await getResend().emails.send({
    from,
    to,
    subject: subjects[locale].reset.subject,
    react: <ResetPasswordEmail url={url} locale={locale} />,
  });
}
