"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";

const LEVELS = [100, 200, 300, 400, 500] as const;

type ProfileData = {
  name: string;
  email: string;
  avatarUrl: string;
  matricNumber: string;
  level: number | null;
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

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-[20px] font-semibold text-muted-foreground">{initial}</span>
      )}
    </div>
  );
}

export function StudentProfilePanel() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [saved, setSaved] = useState<ProfileData | null>(null);
  const [draft, setDraft] = useState<ProfileData | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/student/profile");
        const data = await res.json();

        if (!res.ok) {
          if (!cancelled) setLoadError(data.error ?? "Could not load profile.");
          return;
        }

        const profile: ProfileData = {
          name: data.profile.name ?? "",
          email: data.profile.email ?? "",
          avatarUrl: data.profile.avatarUrl ?? "",
          matricNumber: data.profile.matricNumber ?? "",
          level: data.profile.level ?? null,
          university: data.profile.universityName ?? "",
          department: data.profile.departmentName ?? "",
        };

        if (!cancelled) {
          setSaved(profile);
          setDraft(profile);
        }
      } catch {
        if (!cancelled) setLoadError("Network error. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function startEdit() {
    if (!saved) return;
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

  function setField(key: keyof ProfileData, value: string | number | null) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          avatarUrl: draft.avatarUrl,
          matricNumber: draft.matricNumber,
          level: draft.level,
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
        name: data.profile.name ?? "",
        email: data.profile.email ?? "",
        avatarUrl: data.profile.avatarUrl ?? "",
        matricNumber: data.profile.matricNumber ?? "",
        level: data.profile.level ?? null,
        university: data.profile.universityName ?? "",
        department: data.profile.departmentName ?? "",
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

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-card border border-card-border bg-card p-card shadow-card">
        <p className="text-[13px] text-muted-foreground">Loading profile…</p>
      </div>
    );
  }

  if (loadError || !saved || !draft) {
    return (
      <div className="rounded-input border border-destructive/30 bg-destructive/5 px-4 py-3">
        <p className="text-[13px] text-destructive">{loadError ?? "Could not load profile."}</p>
      </div>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────
  if (mode === "edit") {
    return (
      <form onSubmit={handleSubmit} className="space-y-element">
        <div className="flex items-center gap-4 rounded-card border border-card-border bg-card p-card shadow-card">
          <Avatar name={draft.name} avatarUrl={draft.avatarUrl} />
          <div className="flex-1">
            <Input
              label="Avatar URL"
              id="avatarUrl"
              placeholder="https://…"
              value={draft.avatarUrl}
              onChange={(e) => setField("avatarUrl", e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <Input
          label="Name"
          id="name"
          placeholder="e.g. Jane Doe"
          value={draft.name}
          onChange={(e) => setField("name", e.target.value)}
          disabled={saving}
        />

        <Input label="Email" id="email" value={draft.email} disabled readOnly hint="Email cannot be changed" />

        <Input
          label="Matric Number"
          id="matricNumber"
          placeholder="e.g. 190405123"
          value={draft.matricNumber}
          onChange={(e) => setField("matricNumber", e.target.value)}
          disabled={saving}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="level" className="text-[13px] font-medium text-foreground">
            Level
          </label>
          <select
            id="level"
            value={draft.level ?? ""}
            onChange={(e) => setField("level", e.target.value ? Number(e.target.value) : null)}
            disabled={saving}
            className="h-12 w-full rounded-input border border-border bg-background px-4 text-[16px] sm:text-[15px] text-foreground transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground"
          >
            <option value="">Select level</option>
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {level} Level
              </option>
            ))}
          </select>
        </div>

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
            {saving ? "Saving…" : "Save Changes"}
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

      <section className="flex items-center gap-4 rounded-card border border-card-border bg-card p-card shadow-card">
        <Avatar name={saved.name} avatarUrl={saved.avatarUrl} />
        <div>
          <p className="text-[15px] font-semibold text-foreground">{saved.name || "—"}</p>
          <p className="text-[13px] text-muted-foreground">{saved.email}</p>
        </div>
      </section>

      <section className="space-y-element rounded-card border border-card-border bg-card p-card shadow-card">
        <InfoRow label="Matric Number" value={saved.matricNumber} />
        <InfoRow label="Level" value={saved.level ? `${saved.level} Level` : ""} />
        <InfoRow label="University" value={saved.university} />
        <InfoRow label="Department" value={saved.department} />
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
