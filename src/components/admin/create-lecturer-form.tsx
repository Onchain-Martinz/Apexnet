"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { EmailInput, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

interface CreatedLecturer {
  name: string;
  email: string;
  temporaryPassword: string;
}

export function CreateLecturerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedLecturer | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(routes.api.admin.lecturers, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setCreated({
        name: data.lecturer.name,
        email: data.lecturer.email,
        temporaryPassword: data.temporaryPassword,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — admin can still select and copy the text manually.
    }
  }

  if (created) {
    return (
      <div className="space-y-element">
        <div className="rounded-input border border-success/30 bg-success/5 px-4 py-3">
          <p className="text-[13px] text-success">Lecturer account created.</p>
        </div>

        <div className="space-y-3 rounded-input border border-card-border bg-card p-4">
          <p className="text-[13px] text-muted-foreground">
            Give these details to <span className="font-medium text-foreground">{created.name}</span>. This password
            is shown only once — they&apos;ll be required to set their own on first login.
          </p>

          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Email</p>
            <p className="mt-0.5 text-[14px] font-medium text-foreground">{created.email}</p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Temporary password</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="font-mono text-[16px] font-semibold text-foreground">{created.temporaryPassword}</p>
              <button
                type="button"
                onClick={handleCopy}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-button border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
              >
                {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={() => {
            router.push(routes.admin.lecturers);
            router.refresh();
          }}
        >
          Done
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-element">
      <Input
        label="Name"
        id="name"
        placeholder="e.g. Dr. Jane Doe"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={saving}
        required
      />

      <EmailInput
        label="Email"
        id="email"
        placeholder="lecturer@university.edu"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
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
