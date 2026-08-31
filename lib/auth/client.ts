import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth/config";

export const authClient = createAuthClient({
  // Types `authClient.useSession()` (and friends) with the server's
  // `user.additionalFields` — `isInstructor` / `isAdmin` (AD-6). Type-only
  // import of `auth`, so no server code is pulled into the client bundle.
  plugins: [inferAdditionalFields<typeof auth>()],
});
