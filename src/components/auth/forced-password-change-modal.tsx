"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PasswordInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { changePasswordSchema } from "@/lib/validations/auth";

type FieldErrors = {
  newPassword?: string;
  confirmPassword?: string;
};

// Blocking — intentionally no close button, no backdrop dismiss, no Escape
// handler (unlike the shared Modal component). The only way out is
// completing the password change. Rendered from (dashboard)/layout.tsx
// whenever session.user.mustChangePassword is true, so the dashboard itself
// has already loaded underneath.
export function ForcedPasswordChangeModal() {
  const router = useRouter();
  const { update } = useSession();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGlobalError("");
    setFieldErrors({});

    const parsed = changePasswordSchema.safeParse({ newPassword, confirmPassword });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Pass a defined object so next-auth/react issues a POST (not GET) to
      // /api/auth/session — only POST sets trigger: "update" in the jwt
      // callback, which re-fetches mustChangePassword from the DB.
      await update({});
      router.refresh();
    } catch {
      setGlobalError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-md rounded-t-card sm:rounded-card border border-card-border bg-card p-card shadow-card">
        <h2 className="text-[18px] font-bold text-foreground">Set a new password</h2>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Your account was created with a temporary password. Please change your password to continue.
        </p>

        {globalError && (
          <div
            className="mt-4 rounded-input border border-destructive/30 bg-destructive/5 px-4 py-3"
            role="alert"
          >
            <p className="text-[13px] text-destructive">{globalError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <PasswordInput
            label="New password"
            id="new-password"
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={fieldErrors.newPassword}
            hint="Must contain an uppercase letter and a number"
            disabled={submitting}
          />

          <PasswordInput
            label="Confirm new password"
            id="confirm-password"
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={fieldErrors.confirmPassword}
            disabled={submitting}
          />

          <Button type="submit" size="lg" className="w-full" loading={submitting}>
            {submitting ? "Saving…" : "Set password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
