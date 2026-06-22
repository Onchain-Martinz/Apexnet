"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Input, PasswordInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerSchema } from "@/lib/validations/auth";
import { cn } from "@/lib/utils/cn";

type Role = "STUDENT" | "LECTURER";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};


export default function SignupPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("STUDENT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);

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
        body: JSON.stringify({ name, email, password, confirmPassword, role }),
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

        <Input
          label="Email"
          type="email"
          placeholder="you@university.edu.ng"
          autoComplete="email"
          autoCapitalize="none"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          disabled={loading}
        />

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
