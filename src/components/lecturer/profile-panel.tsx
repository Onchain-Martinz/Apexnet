"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Check, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BankVerificationPanel, type BankVerificationData } from "@/components/lecturer/bank-verification-panel";

type ProfileData = {
  title: string;
  university: string;
  department: string;
};

// ── Read-only field row ──────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="text-[15px] font-semibold text-foreground">{value || "—"}</p>
    </div>
  );
}

export function ProfilePanel({
  name,
  email,
  verified,
  initial,
  initialBank,
}: {
  name: string;
  email: string;
  verified: boolean;
  initial: ProfileData;
  initialBank: BankVerificationData;
}) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [saved, setSaved] = useState<ProfileData>(initial);
  const [draft, setDraft] = useState<ProfileData>(initial);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function startEdit() {
    setDraft(saved);
    setError(null);
    setSuccess(false);
    setMode("edit");
  }

  function cancelEdit() {
    setDraft(saved);
    setError(null);
    setMode("view");
  }

  function setField(key: keyof ProfileData, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/lecturer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          universityName: draft.university,
          departmentName: draft.department,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      const updated: ProfileData = {
        title: data.profile.title ?? "",
        university: data.profile.university?.name ?? "",
        department: data.profile.department?.name ?? "",
      };

      setSaved(updated);
      setDraft(updated);
      setSuccess(true);
      setMode("view");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────
  if (mode === "edit") {
    return (
      <form onSubmit={handleSubmit} className="space-y-element">
        <Input
          label="Academic Title"
          id="title"
          placeholder="e.g. Dr., Prof., Mr."
          value={draft.title}
          onChange={(e) => setField("title", e.target.value)}
          disabled={saving}
        />

        <Input
          label="University"
          id="university"
          placeholder="e.g. University of Lagos"
          value={draft.university}
          onChange={(e) => setField("university", e.target.value)}
          disabled={saving}
        />

        <Input
          label="Department"
          id="department"
          placeholder="e.g. Computer Science"
          value={draft.department}
          onChange={(e) => setField("department", e.target.value)}
          disabled={saving}
        />

        {error && (
          <div className="rounded-input border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-[13px] text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-element">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={cancelEdit}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" size="lg" className="flex-1" loading={saving} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    );
  }

  // ── View mode ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-section">
      {success && (
        <div className="rounded-input border border-success/30 bg-success/5 px-4 py-3">
          <p className="text-[13px] text-success">Profile updated.</p>
        </div>
      )}

      {/* ── Identity card ── */}
      <section className="space-y-element rounded-card border border-card-border bg-card p-card shadow-card">
        <InfoRow label="Name" value={name} />
        <InfoRow label="Email" value={email} />
        <InfoRow label="Academic Title" value={saved.title} />
        <InfoRow label="University" value={saved.university} />
        <InfoRow label="Department" value={saved.department} />
      </section>

      {/* ── Verification Status card ── */}
      <section className="rounded-card border border-card-border bg-card p-card shadow-card">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          Verification Status
        </p>
        {verified ? (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-success/10">
              <Check className="h-4 w-4 text-success" strokeWidth={3} aria-hidden />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-foreground">Verified Lecturer</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                Your account is approved to publish textbooks.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[15px] font-medium text-muted-foreground">
            Not yet verified — contact Apex support if you believe this is an error.
          </p>
        )}
      </section>

      {/* ── Withdrawal Account ── */}
      <BankVerificationPanel initial={initialBank} />

      {/* ── Security card ── */}
      <section className="overflow-hidden rounded-card border border-card-border bg-card shadow-card">
        <div className="px-5 pt-5 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
            Security
          </p>
        </div>

        <Link
          href="/forgot-password"
          className="flex items-center justify-between border-t border-card-border px-5 py-4 transition-colors active:bg-muted"
        >
          <p className="text-[15px] font-medium text-foreground">Change Password</p>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </Link>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center justify-between border-t border-card-border px-5 py-4 text-left transition-colors active:bg-muted"
        >
          <p className="text-[15px] font-medium text-destructive">Sign Out</p>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </button>
      </section>

      {/* ── Edit Profile ── */}
      <Button size="lg" className="w-full" onClick={startEdit}>
        Edit Profile
      </Button>
    </div>
  );
}
