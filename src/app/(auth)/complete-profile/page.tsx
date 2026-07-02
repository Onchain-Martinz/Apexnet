"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type Role = "STUDENT" | "LECTURER";
const LEVELS = [100, 200, 300, 400, 500];

type FieldErrors = {
  name?: string;
  universityName?: string;
  departmentName?: string;
  level?: string;
  matricNumber?: string;
};

const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/student",
  LECTURER: "/lecturer",
};

export default function CompleteProfilePage() {
  const router = useRouter();
  const { data: session, update } = useSession();

  const [role, setRole] = useState<Role>("STUDENT");
  const [name, setName] = useState(session?.user?.name ?? "");
  const [universityName, setUniversityName] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [level, setLevel] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError("");
    setFieldErrors({});

    // Basic client-side validation
    const errors: FieldErrors = {};
    if (!name.trim() || name.trim().length < 2) errors.name = "Full name must be at least 2 characters.";
    if (!universityName.trim()) errors.universityName = "University is required.";
    if (!departmentName.trim()) errors.departmentName = "Department is required.";
    if (role === "STUDENT" && !level) errors.level = "Please select your level.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          name: name.trim(),
          universityName: universityName.trim(),
          departmentName: departmentName.trim(),
          ...(role === "STUDENT" && { level: parseInt(level, 10) }),
          ...(role === "STUDENT" && matricNumber.trim() && { matricNumber: matricNumber.trim() }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Refresh the JWT so profileComplete and role are up to date.
      await update({});

      router.push(ROLE_HOME[role]);
      router.refresh();
    } catch {
      setGlobalError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Complete your profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A few quick details before you get started
        </p>
      </div>

      {globalError && (
        <div
          className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive animate-slide-down"
          role="alert"
        >
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Role selector */}
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

        {/* Full name — pre-filled from Google */}
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

        {role === "STUDENT" && (
          <>
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
                  "h-12 w-full rounded-input border bg-input px-4",
                  "text-[16px] sm:text-[15px]",
                  "transition-all duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary focus:shadow-glow",
                  level === "" ? "text-muted-foreground" : "text-foreground",
                  fieldErrors.level
                    ? "border-destructive focus:ring-destructive/20"
                    : "border-border",
                )}
              >
                <option value="" disabled>Select level</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l} Level</option>
                ))}
              </select>
              {fieldErrors.level && (
                <p className="text-caption text-destructive" role="alert">{fieldErrors.level}</p>
              )}
            </div>

            <Input
              label="Matric number (optional)"
              type="text"
              placeholder="e.g. 2020/123456"
              value={matricNumber}
              onChange={(e) => setMatricNumber(e.target.value)}
              error={fieldErrors.matricNumber}
              disabled={loading}
            />
          </>
        )}

        <Button
          type="submit"
          className="w-full mt-2"
          size="lg"
          loading={loading}
        >
          {loading ? "Saving…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
