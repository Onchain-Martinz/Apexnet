"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

interface LecturerActionsProps {
  lecturerProfileId: string;
  userId: string;
  verified: boolean;
  isActive: boolean;
}

type ActionKey = "verify" | "suspend" | "login-as";

export function LecturerActions({ lecturerProfileId, userId, verified, isActive }: LecturerActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<ActionKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleVerified() {
    setError(null);
    setLoading("verify");
    try {
      const res = await fetch(routes.api.admin.lecturerVerify(lecturerProfileId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: !verified }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to update verification");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function toggleActive() {
    setError(null);
    setLoading("suspend");
    try {
      const res = await fetch(routes.api.admin.userStatus(userId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to update status");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function loginAs() {
    setError(null);
    setLoading("login-as");
    try {
      const res = await fetch(routes.api.admin.impersonate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to log in as this user");
        setLoading(null);
        return;
      }
      window.location.href = routes.lecturer.root;
    } catch {
      setError("Network error. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          loading={loading === "verify"}
          disabled={loading !== null}
          onClick={toggleVerified}
        >
          {verified ? "Unverify" : "Verify"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          loading={loading === "suspend"}
          disabled={loading !== null}
          onClick={toggleActive}
        >
          {isActive ? "Suspend" : "Unsuspend"}
        </Button>
        <Button
          size="sm"
          loading={loading === "login-as"}
          disabled={loading !== null || !isActive}
          onClick={loginAs}
        >
          Login As
        </Button>
      </div>
    </div>
  );
}
