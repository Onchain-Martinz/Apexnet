"use client";

import { useState } from "react";
import { routes } from "@/config/routes";

// ── Buy Now button ───────────────────────────────────────────────────────────
// Starts a Paystack checkout for a paid textbook and redirects the browser
// to the returned authorization URL.

export function BuyButton({ textbookId }: { textbookId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(routes.api.purchases.initialize, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textbookId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not start checkout. Please try again.");
        setLoading(false);
        return;
      }

      window.location.href = data.authorizationUrl;
    } catch {
      setError("Could not start checkout. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex h-14 w-full items-center justify-center rounded-button bg-primary text-[15px] font-semibold text-primary-foreground transition-all duration-150 active:scale-[0.97] disabled:opacity-60"
      >
        {loading ? "Redirecting to checkout…" : "Buy Now"}
      </button>
      {error && <p className="text-[13px] text-destructive">{error}</p>}
    </div>
  );
}
