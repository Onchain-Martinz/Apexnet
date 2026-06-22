"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

export function CreateLecturerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(routes.api.admin.lecturers, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(routes.admin.lecturers);
        router.refresh();
      }, 800);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-element">
      {success && (
        <div className="rounded-input border border-success/30 bg-success/5 px-4 py-3">
          <p className="text-[13px] text-success">Lecturer account created. Redirecting…</p>
        </div>
      )}

      <Input
        label="Name"
        id="name"
        placeholder="e.g. Dr. Jane Doe"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={saving}
        required
      />

      <Input
        label="Email"
        id="email"
        type="email"
        placeholder="lecturer@university.edu"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={saving}
        required
      />

      <Input
        label="Password"
        id="password"
        type="password"
        placeholder="At least 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={saving}
        required
      />

      {error && (
        <div className="rounded-input border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-[13px] text-destructive">{error}</p>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" loading={saving} disabled={saving}>
        {saving ? "Creating…" : "Create lecturer"}
      </Button>
    </form>
  );
}
