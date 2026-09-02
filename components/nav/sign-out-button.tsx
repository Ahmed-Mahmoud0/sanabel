"use client";

import { useState } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

// Not required by the ACs, but the role-gated nav can only be tested
// end-to-end across roles/accounts if there's a way to leave a session.
// The label is passed in already-translated so this stays a thin client leaf.
export function SignOutButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    try {
      await authClient.signOut();
      router.push("/");
      router.refresh();
    } catch {
      // Best-effort from the client. If the call fails, refresh so the server
      // re-evaluates the session instead of leaving the UI half-signed-out,
      // and let `finally` re-enable the button for a retry.
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      disabled={pending}
      onClick={handleSignOut}
    >
      {label}
    </Button>
  );
}
