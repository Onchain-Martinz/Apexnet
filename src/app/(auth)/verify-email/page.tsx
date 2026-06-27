"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import type { Role } from "@prisma/client";

const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/student",
  LECTURER: "/lecturer",
  ADMIN: "/admin",
};

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
  const router = useRouter();
  const { data: session, update } = useSession();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [verifying, setVerifying] = useState(false);
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
    setError("");

    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    }

    if (digit && index === CODE_LENGTH - 1 && next.every((d) => d)) {
      void handleVerify(next.join(""));
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

    if (pasted.length === CODE_LENGTH) {
      void handleVerify(pasted);
    } else {
      focusInput(pasted.length);
    }
  }

  async function handleVerify(code: string) {
    setError("");
    setInfo("");
    setVerifying(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setDigits(Array(CODE_LENGTH).fill(""));
        focusInput(0);
        return;
      }

      // Pass a defined object so next-auth/react issues a POST (not GET) to
      // /api/auth/session — only POST sets trigger: "update" in the jwt callback.
      await update({});

      const role = session?.user?.role as Role | undefined;
      router.push(role ? ROLE_HOME[role] : "/student");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    setError("");
    setInfo("");
    setResending(true);

    try {
      const res = await fetch("/api/auth/resend-otp", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not resend code. Please try again.");
        if (typeof data.retryAfter === "number") {
          setCooldown(data.retryAfter);
        }
        return;
      }

      setInfo("A new code has been sent to your email.");
      setDigits(Array(CODE_LENGTH).fill(""));
      focusInput(0);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("Could not resend code. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Verify your email
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{session?.user?.email}</span>
        </p>
      </div>

      {error && (
        <div
          className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive animate-slide-down"
          role="alert"
        >
          {error}
        </div>
      )}

      {info && !error && (
        <div className="mb-6 rounded-xl bg-muted px-4 py-3 text-sm text-foreground animate-slide-down">
          {info}
        </div>
      )}

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
            disabled={verifying}
            className="h-14 w-12 rounded-input border border-border bg-input text-center text-xl font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary focus:shadow-glow transition-all duration-150"
          />
        ))}
      </div>

      <Button
        type="button"
        className="w-full mt-6"
        size="lg"
        loading={verifying}
        disabled={digits.some((d) => !d)}
        onClick={() => handleVerify(digits.join(""))}
      >
        {verifying ? "Verifying…" : "Verify"}
      </Button>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Didn&apos;t get the code?{" "}
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
        Wrong account?{" "}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="font-medium text-primary hover:underline underline-offset-4"
        >
          Sign out
        </button>
      </p>
    </div>
  );
}
