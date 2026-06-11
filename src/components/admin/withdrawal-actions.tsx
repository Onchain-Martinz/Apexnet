"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface WithdrawalActionsProps {
  id: string;
}

export function WithdrawalActions({ id }: WithdrawalActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(status: "APPROVED" | "REJECTED") {
    setError(null);
    setLoading(status);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to update request");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          loading={loading === "REJECTED"}
          disabled={loading !== null}
          onClick={() => review("REJECTED")}
        >
          Reject
        </Button>
        <Button
          size="sm"
          className="flex-1"
          loading={loading === "APPROVED"}
          disabled={loading !== null}
          onClick={() => review("APPROVED")}
        >
          Approve
        </Button>
      </div>
    </div>
  );
}
