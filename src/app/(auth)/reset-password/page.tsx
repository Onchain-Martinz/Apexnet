"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { EmailInput, PasswordInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/auth";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

type FieldErrors = {
  email?: string;
  code?: string;
  newPassword?: string;
  confirmPassword?: string;
};

// ── Inner form — uses useSearchParams, must be inside <Suspense> ─────────────

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(emailFromQuery);
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function focusInput(index: number) {
    inputRefs.current[index]?.focus();
  }

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setFieldErrors((prev) => ({ ...prev, code: undefined }));

    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      focusInput(index - 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();

    const next = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    focusInput(Math.min(pasted.length, CODE_LENGTH - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError("");
    setInfo("");
    setFieldErrors({});

    const code = digits.join("");
    const parsed = resetPasswordSchema.safeParse({
      email,
      code,
      newPassword,
      confirmPassword,
    });

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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          code,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push("/login");
    } catch {
      setGlobalError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setGlobalError("");
    setInfo("");
    setFieldErrors({});

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldErrors({ email: parsed.error.issues[0]?.message ?? "Enter a valid email address" });
      return;
    }

    setResending(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.error ?? "Could not resend code. Please try again.");
        if (typeof data.retryAfter === "number") {
          setCooldown(data.retryAfter);
        }
        return;
      }

      setInfo("If an account exists for this email, a new code has been sent.");
      setDigits(Array(CODE_LENGTH).fill(""));
      focusInput(0);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setGlobalError("Could not resend code. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      {globalError && (
        <div
          className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive animate-slide-down"
          role="alert"
        >
          {globalError}
        </div>
      )}

      {info && !globalError && (
        <div className="mb-6 rounded-xl bg-muted px-4 py-3 text-sm text-foreground animate-slide-down">
          {info}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <EmailInput
          label="Email"
          placeholder="you@university.edu.ng"
          autoComplete="email"
          autoCapitalize="none"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          disabled={submitting}
        />

        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">6-digit code</p>
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={submitting}
                className="h-14 w-12 rounded-input border border-border bg-background text-center text-xl font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground transition-all duration-150"
              />
            ))}
          </div>
          {fieldErrors.code && (
            <p className="mt-1.5 text-caption text-destructive text-center" role="alert">
              {fieldErrors.code}
            </p>
          )}
        </div>

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

        <Button type="submit" className="w-full mt-2" size="lg" loading={submitting}>
          {submitting ? "Resetting…" : "Reset password"}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Didn&apos;t get a code?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="font-medium text-primary hover:underline underline-offset-4 disabled:no-underline disabled:text-muted-foreground disabled:cursor-not-allowed"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Sending…" : "Resend code"}
        </button>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}

// ── Page shell — wraps form in Suspense as required by Next.js ───────────────

export default function ResetPasswordPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the code we sent you and choose a new password.
        </p>
      </div>

      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
