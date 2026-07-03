"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { EmailInput, Input, PasswordInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/auth/google-button";
import { AuthErrorBanner } from "@/components/auth/auth-error-banner";
import { registerSchema } from "@/lib/validations/auth";
import { cn } from "@/lib/utils/cn";

type Role = "STUDENT" | "LECTURER";

// Two-step signup: pick a method first, then reveal the chosen form inline.
type SignupMode = "chooser" | "email";

const LEVELS = [100, 200, 300, 400, 500];

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  universityName?: string;
  departmentName?: string;
  level?: string;
};


export default function SignupPage() {
  const router = useRouter();

  const [mode, setMode] = useState<SignupMode>("chooser");
  const [role, setRole] = useState<Role>("STUDENT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [level, setLevel] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);

  function backToChooser() {
    setMode("chooser");
    setGlobalError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError("");
    setFieldErrors({});

    const parsed = registerSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
      role,
      universityName,
      departmentName,
      level: level === "" ? undefined : level,
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

    setLoading(true);

    try {
      // 1. Create the account
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          confirmPassword,
          role,
          ...(role === "STUDENT" ? { universityName, departmentName, level } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.error ?? "Registration failed. Please try again.");
        return;
      }

      // 2. Auto sign-in after successful registration
      const result = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (!result?.ok) {
        // Account created but sign-in failed — redirect to login
        router.push("/login");
        return;
      }

      // 3. New accounts are unverified — send them to /verify-email
      router.push("/verify-email");
      router.refresh();
    } catch {
      setGlobalError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Join students and lecturers across Africa
        </p>
      </div>

      {/* Google sign-in error banner (?error= from the OAuth flow) */}
      <Suspense>
        <AuthErrorBanner />
      </Suspense>

      {mode === "chooser" ? (
        /* ── Step 1: choose a signup method ─────────────────────────────── */
        <div className="space-y-3">
          {/* Google onboarding lane — new users can skip the password form */}
          <GoogleButton callbackUrl="/student" />

          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full"
            onClick={() => setMode("email")}
          >
            Continue with Email
          </Button>
        </div>
      ) : (
        /* ── Step 2: email signup form ──────────────────────────────────── */
        <div className="animate-fade-in">
          <button
            type="button"
            onClick={backToChooser}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span aria-hidden>←</span> Use Google instead
          </button>

          {/* Global error banner */}
          {globalError && (
            <div
              className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive animate-slide-down"
              role="alert"
            >
              {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Role selector — Apple-style segmented control */}
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">I am a</p>
              <div className="flex rounded-xl bg-muted p-1 gap-1">
                {(["STUDENT", "LECTURER"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                      role === r
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {r === "STUDENT" ? "Student" : "Lecturer"}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Full name"
              type="text"
              placeholder={role === "STUDENT" ? "Amara Okafor" : "Dr. Amara Okafor"}
              autoComplete="name"
              autoCapitalize="words"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={fieldErrors.name}
              disabled={loading}
            />

            <EmailInput
              label="Email"
              placeholder="you@university.edu.ng"
              autoComplete="email"
              autoCapitalize="none"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              disabled={loading}
            />

            {role === "STUDENT" && (
              <>
                <Input
                  label="University"
                  type="text"
                  placeholder="e.g. University of Lagos"
                  value={universityName}
                  onChange={(e) => setUniversityName(e.target.value)}
                  error={fieldErrors.universityName}
                  disabled={loading}
                />

                <Input
                  label="Department"
                  type="text"
                  placeholder="e.g. Psychology"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  error={fieldErrors.departmentName}
                  disabled={loading}
                />

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="level" className="text-sm font-medium text-foreground">
                    Level
                  </label>
                  <select
                    id="level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    disabled={loading}
                    className={cn(
                      "h-12 w-full rounded-input border bg-background px-4",
                      "text-[16px] sm:text-[15px]",
                      "transition-all duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground",
                      level === "" ? "text-muted-foreground" : "text-foreground",
                      fieldErrors.level
                        ? "border-destructive focus:ring-destructive/20"
                        : "border-border",
                    )}
                  >
                    <option value="" disabled>
                      Select level
                    </option>
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l} Level
                      </option>
                    ))}
                  </select>
                  {fieldErrors.level && (
                    <p className="text-caption text-destructive" role="alert">{fieldErrors.level}</p>
                  )}
                </div>
              </>
            )}

            <PasswordInput
              label="Password"
              id="new-password"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              hint="Must contain an uppercase letter and a number"
              disabled={loading}
            />

            <PasswordInput
              label="Confirm password"
              id="confirm-password"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={fieldErrors.confirmPassword}
              disabled={loading}
            />

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              loading={loading}
            >
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </div>
      )}

      <p className="mt-4 text-center text-[11px] text-muted-foreground leading-relaxed px-4">
        By creating an account you agree to our{" "}
        <span className="underline underline-offset-2 cursor-pointer">Terms of Service</span>
        {" "}and{" "}
        <span className="underline underline-offset-2 cursor-pointer">Privacy Policy</span>.
      </p>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
