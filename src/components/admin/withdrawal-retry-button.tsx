"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface WithdrawalRetryButtonProps {
  id: string;
}

export function WithdrawalRetryButton({ id }: WithdrawalRetryButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/retry`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to retry transfer");
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
      <Button size="sm" className="w-full" loading={loading} disabled={loading} onClick={retry}>
        Retry transfer
      </Button>
    </div>
  );
}
