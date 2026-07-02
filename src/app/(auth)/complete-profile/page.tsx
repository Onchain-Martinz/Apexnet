"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { completeProfileSchema } from "@/lib/validations/auth";
import { cn } from "@/lib/utils/cn";
import type { Role as PrismaRole } from "@prisma/client";

type Role = "STUDENT" | "LECTURER";

const LEVELS = [100, 200, 300, 400, 500];

const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/student",
  LECTURER: "/lecturer",
};

type FieldErrors = {
  name?: string;
  universityName?: string;
  departmentName?: string;
  level?: string;
};

export default function CompleteProfilePage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();

  const [role, setRole] = useState<Role>("STUDENT");
  const [name, setName] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [level, setLevel] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Route guards: unauthenticated → login; already-complete → dashboard.
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.user) {
      router.replace("/login");
      return;
    }

    if (session.user.profileComplete) {
      const r = (session.user.role as PrismaRole) ?? "STUDENT";
      router.replace(ROLE_HOME[r as Role] ?? "/student");
      return;
    }

    // Prefill the Google-provided name once.
    if (!prefilled) {
      setName(session.user.name ?? "");
      setPrefilled(true);
    }
  }, [status, session, router, prefilled]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError("");
    setFieldErrors({});

    const parsed = completeProfileSchema.safeParse({
      name,
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
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role,
          ...(role === "STUDENT" ? { universityName, departmentName, level } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Refresh the session token so it reflects the new role + profileComplete
      // (POST to /api/auth/session triggers the jwt "update" branch), then route.
      await update({});
      router.push(ROLE_HOME[role]);
      router.refresh();
    } catch {
      setGlobalError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Avoid flashing the form before the guard resolves.
  if (status === "loading" || !session?.user || session.user.profileComplete) {
    return null;
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Complete your profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us a little about you to finish setting up your account
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

        <Button
          type="submit"
          className="w-full mt-2"
          size="lg"
          loading={loading}
        >
          {loading ? "Finishing up…" : "Finish setup"}
        </Button>
      </form>
    </div>
  );
}
