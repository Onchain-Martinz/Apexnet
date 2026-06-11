"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VerificationBadge } from "@/components/ui/verification-badge";
import { SignOutButton } from "@/components/auth/sign-out-button";

type ProfileData = {
  title: string;
  university: string;
  department: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
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
}: {
  name: string;
  email: string;
  verified: boolean;
  initial: ProfileData;
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
          bankName: draft.bankName,
          bankAccountNumber: draft.bankAccountNumber,
          bankAccountName: draft.bankAccountName,
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
        bankName: data.profile.bankName ?? "",
        bankAccountNumber: data.profile.bankAccountNumber ?? "",
        bankAccountName: data.profile.bankAccountName ?? "",
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

        <hr className="border-card-border" />

        <h2 className="text-[15px] font-semibold text-foreground">Bank Information</h2>

        <Input
          label="Account Name"
          id="bankAccountName"
          placeholder="e.g. Jane Doe"
          value={draft.bankAccountName}
          onChange={(e) => setField("bankAccountName", e.target.value)}
          disabled={saving}
        />

        <Input
          label="Account Number"
          id="bankAccountNumber"
          placeholder="e.g. 0123456789"
          value={draft.bankAccountNumber}
          onChange={(e) => setField("bankAccountNumber", e.target.value)}
          disabled={saving}
        />

        <Input
          label="Bank Name"
          id="bankName"
          placeholder="e.g. GTBank"
          value={draft.bankName}
          onChange={(e) => setField("bankName", e.target.value)}
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

      <section className="space-y-element rounded-card border border-card-border bg-card p-card shadow-card">
        <InfoRow label="Name" value={name} />
        <InfoRow label="Email" value={email} />
        <InfoRow label="Academic Title" value={saved.title} />
        <InfoRow label="University" value={saved.university} />
        <InfoRow label="Department" value={saved.department} />
      </section>

      <section className="flex items-center gap-2 rounded-card border border-card-border bg-card p-card shadow-card">
        {verified ? (
          <>
            <VerificationBadge />
            <p className="text-[15px] font-semibold text-foreground">Verified Lecturer</p>
          </>
        ) : (
          <p className="text-[15px] font-semibold text-muted-foreground">Not Verified</p>
        )}
      </section>

      <section className="space-y-element rounded-card border border-card-border bg-card p-card shadow-card">
        <InfoRow label="Account Name" value={saved.bankAccountName} />
        <InfoRow label="Account Number" value={saved.bankAccountNumber} />
        <InfoRow label="Bank Name" value={saved.bankName} />
      </section>

      <div className="flex gap-element">
        <Button size="lg" className="flex-1" onClick={startEdit}>
          Edit Profile
        </Button>
        <SignOutButton size="lg" className="flex-1" />
      </div>
    </div>
  );
}
