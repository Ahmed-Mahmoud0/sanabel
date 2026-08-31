import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { generateId } from "@/lib/db/id";
import { getLocaleFromRequest } from "@/lib/auth/locale";
import { sendResetPasswordEmail, sendVerificationEmail } from "@/lib/auth/send-email";

// Task 2's whole purpose is to keep the Admin surface reachable. If the var is
// missing in production, nothing grants Admin and the failure is otherwise
// silent — surface it at boot.
if (process.env.NODE_ENV === "production" && !process.env.ADMIN_EMAIL?.trim()) {
  console.warn(
    "[auth] ADMIN_EMAIL is not set in production — no account will be bootstrapped " +
      "as Admin, and Admin-only surfaces stay unreachable until a flag is set manually.",
  );
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  advanced: {
    database: {
      generateId: () => generateId(),
    },
  },
  user: {
    // AD-6 additive role flags. `input: false` is load-bearing: it removes
    // these from the client-writable input schema, so a crafted signUp /
    // updateUser payload cannot self-grant a role. They are only ever set
    // server-side — by the ADMIN_EMAIL bootstrap below, or Story 1.4's
    // grant/revoke flow. The matching Drizzle columns live in
    // lib/modules/accounts/schema.ts; both must move together or the
    // session user object won't carry the fields.
    additionalFields: {
      isInstructor: { type: "boolean", defaultValue: false, input: false },
      isAdmin: { type: "boolean", defaultValue: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Admin bootstrap (Story 1.3, Task 2). Nothing in the FRs or epics
        // defines how the very first Admin is created: Story 1.4 only covers
        // an existing Admin granting/revoking the *Instructor* role, and FR-4
        // rules out any self-service request flow. Without a bootstrap, the
        // Admin-only surface this story introduces would be permanently
        // unreachable. When a new user's email matches ADMIN_EMAIL
        // (case-insensitively), mark them Admin. Fires for every provider
        // (email/password and social) and is idempotent — each create simply
        // re-derives the flag from the env var.
        //
        // Implemented on `create.before` (the story text says `create.after`):
        // `before` writes the flag in the same insert, avoiding a second
        // round-trip and keeping all persistence behind Better Auth's adapter
        // per AD-1. The task's intent — env-driven, idempotent, all providers,
        // in config.ts via databaseHooks — is unchanged.
        before: async (user) => {
          const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
          if (adminEmail && user.email.trim().toLowerCase() === adminEmail) {
            // Deliberately audible: a silent env-driven Admin grant is hard to
            // notice or investigate later.
            console.warn(`[auth] ADMIN_EMAIL bootstrap: granting Admin to ${user.email}`);
            return { data: { ...user, isAdmin: true } };
          }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }, request) => {
      await sendResetPasswordEmail(user.email, url, getLocaleFromRequest(request));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }, request) => {
      await sendVerificationEmail(user.email, url, getLocaleFromRequest(request));
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    },
  },
  account: {
    accountLinking: {
      trustedProviders: ["google", "github"],
    },
  },
});
