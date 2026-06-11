"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

interface Buyer {
  id: string;
  name: string;
  university: string | null;
  purchasedAt: Date;
}

interface TextbookSalesRowProps {
  title: string;
  price: number;
  copiesSold: number;
  revenue: number;
  buyers: Buyer[];
}

export function TextbookSalesRow({ title, price, copiesSold, revenue, buyers }: TextbookSalesRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-card border border-card-border bg-card shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 p-card text-left"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-[15px] font-semibold text-foreground">{title}</p>
          <p className="text-[13px] text-muted-foreground">
            {price === 0 ? "Free" : naira(price)} · {copiesSold} copies sold
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <p className="text-[15px] font-semibold text-foreground">{naira(revenue)}</p>
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </div>
      </button>

      {open && (
        <div className="space-y-element border-t border-card-border p-card pt-element">
          <div className="grid grid-cols-2 gap-element">
            <div className="rounded-card border border-card-border bg-muted/40 p-3">
              <p className="text-[18px] font-bold leading-none text-foreground">{copiesSold}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Total Purchases</p>
            </div>
            <div className="rounded-card border border-card-border bg-muted/40 p-3">
              <p className="text-[18px] font-bold leading-none text-foreground">{naira(revenue)}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Revenue Generated</p>
            </div>
          </div>

          {buyers.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No purchases yet.</p>
          ) : (
            <div className="space-y-2">
              {buyers.map((buyer) => (
                <div
                  key={buyer.id}
                  className="flex items-center justify-between gap-4 rounded-card border border-card-border bg-background p-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-[13px] font-semibold text-foreground">{buyer.name}</p>
                    {buyer.university && (
                      <p className="truncate text-[12px] text-muted-foreground">{buyer.university}</p>
                    )}
                  </div>
                  <p className="flex-shrink-0 text-[12px] text-muted-foreground">
                    {buyer.purchasedAt.toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
