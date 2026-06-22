"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import type { TextbookStatus } from "@prisma/client";

interface TextbookActionsProps {
  textbookId: string;
  status: TextbookStatus;
}

export function TextbookActions({ textbookId, status }: TextbookActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "DRAFT") return null;

  const nextStatus = status === "PUBLISHED" ? "ARCHIVED" : "PUBLISHED";
  const label = status === "PUBLISHED" ? "Hide" : "Unhide";

  async function toggleStatus() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(routes.api.admin.textbookStatus(textbookId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to update textbook");
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
    <div className="space-y-1">
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      <Button size="sm" variant="outline" loading={loading} disabled={loading} onClick={toggleStatus}>
        {label}
      </Button>
    </div>
  );
}
