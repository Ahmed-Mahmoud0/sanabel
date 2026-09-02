"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { BIO_MAX_LENGTH } from "@/lib/modules/accounts/profile";

// Editing your OWN row, so this goes through Better Auth's self-service
// `authClient.updateUser` (targets `session.user.id`) — no Server Action, unlike
// Story 1.4's admin-edits-another-account flow. `bio` is only sent, and only
// rendered, for Instructors: for a Learner the field is absent from the DOM
// (AC #3), not merely hidden. Server-side backstops in `lib/auth/config.ts`: the
// `bio` field's `validator.input` caps length, and a `databaseHooks.user.update`
// gate rejects a `bio` from any non-Instructor (added in the 2026-09-02 review).
export function ProfileForm({
  initialName,
  initialBio,
  isInstructor,
}: {
  initialName: string;
  initialBio: string;
  isInstructor: boolean;
}) {
  const t = useTranslations("Profile");
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const trimmedName = name.trim();
  const nextBio = bio.trim();
  // Only block on an over-limit bio the user actually changed. An already-stored
  // bio longer than the cap (cap lowered later, or a direct DB write) must not
  // lock the user out of saving an unrelated display-name change — it matches
  // the server, which only validates a `bio` that is present in the payload.
  const bioTooLong =
    isInstructor && nextBio !== initialBio.trim() && nextBio.length > BIO_MAX_LENGTH;

  function clearStatus() {
    setSuccess(false);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    clearStatus();

    if (trimmedName === "") {
      setError(t("displayNameRequiredError"));
      return;
    }
    if (bioTooLong) {
      setError(t("bioTooLongError", { max: BIO_MAX_LENGTH }));
      return;
    }

    setPending(true);
    try {
      const { error: updateError } = await authClient.updateUser({
        name: trimmedName,
        // Send the trimmed bio, and `null` (not `""`) when cleared, so the
        // nullable column and `getPublicProfile`'s `string | null` contract
        // stay meaningful. Mirrors the `name` trim above.
        ...(isInstructor ? { bio: nextBio === "" ? null : nextBio } : {}),
      });

      if (updateError) {
        setError(t("genericError"));
        return;
      }

      setName(trimmedName);
      setBio(nextBio);
      setSuccess(true);
      // Re-fetch Server Components (site header, this page's own session read)
      // so the new values show immediately — same pattern as sign-in-form.tsx.
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <Field
        id="displayName"
        label={t("displayNameLabel")}
        placeholder={t("displayNamePlaceholder")}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          clearStatus();
        }}
        autoComplete="name"
        maxLength={120}
        required
        disabled={pending}
      />

      {isInstructor && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bio">{t("bioLabel")}</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(event) => {
              setBio(event.target.value);
              clearStatus();
            }}
            placeholder={t("bioPlaceholder")}
            maxLength={BIO_MAX_LENGTH}
            rows={4}
            aria-describedby="bio-count"
            disabled={pending}
          />
          <p id="bio-count" className="self-end text-body-sm text-text-secondary">
            {t("bioCharCount", { count: bio.length, max: BIO_MAX_LENGTH })}
          </p>
        </div>
      )}

      {error && <FormMessage tone="error">{error}</FormMessage>}
      {success && <FormMessage tone="success">{t("success")}</FormMessage>}

      <Button type="submit" disabled={pending} className="mt-2 self-start">
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
