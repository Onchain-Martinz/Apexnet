"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface MarkPaidButtonProps {
  id: string;
}

// Pilot manual-payout flow: the admin has already transferred the funds
// outside the app (Flutterwave dashboard or direct bank transfer) and uses
// this to record that fact — it does not trigger any transfer itself.
export function MarkPaidButton({ id }: MarkPaidButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markPaid() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
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
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      <Button size="sm" className="w-full" loading={loading} disabled={loading} onClick={markPaid}>
        Mark as Paid
      </Button>
    </div>
  );
}
