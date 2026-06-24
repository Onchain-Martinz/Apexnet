"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { EmailInput, Input, PasswordInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { bootstrapAdminSchema } from "@/lib/validations/admin";
import { routes } from "@/config/routes";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
};

export function BootstrapAdminForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGlobalError("");
    setFieldErrors({});

    const parsed = bootstrapAdminSchema.safeParse({ name, email, password });
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
      const res = await fetch(routes.api.admin.bootstrap, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push(routes.login), 1200);
    } catch {
      setGlobalError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-input border border-success/30 bg-success/5 px-4 py-3">
        <p className="text-[13px] text-success">
          Admin account created. Redirecting to login…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-element">
      {globalError && (
        <div className="rounded-input border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-[13px] text-destructive">{globalError}</p>
        </div>
      )}

      <Input
        label="Name"
        type="text"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldErrors.name}
        disabled={loading}
      />

      <EmailInput
        label="Email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
        disabled={loading}
      />

      <PasswordInput
        label="Password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        hint="Must contain an uppercase letter and a number"
        disabled={loading}
      />

      <Button type="submit" size="lg" className="w-full" loading={loading} disabled={loading}>
        {loading ? "Creating admin…" : "Create Admin Account"}
      </Button>
    </form>
  );
}
