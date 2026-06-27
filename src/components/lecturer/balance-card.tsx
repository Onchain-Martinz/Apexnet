"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { WithdrawalModal } from "@/components/lecturer/withdrawal-modal";
import { AvailableBalanceCard } from "@/components/lecturer/available-balance-card";

interface BalanceCardProps {
  availableBalance: number;
  settling: number;
  bankDetails: {
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
  };
}

export function BalanceCard({ availableBalance, settling, bankDetails }: BalanceCardProps) {
  const [open, setOpen] = useState(false);
  const hasBalance = availableBalance > 0;

  return (
    <>
      <AvailableBalanceCard theme="dark" availableBalance={availableBalance} settling={settling}>
        {/* Separator */}
        <div className="mt-4 mb-4 border-t border-foreground/[0.08]" />

        {/* CTA — fit-content action chip, not full-width banner */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!hasBalance}
          className="inline-flex items-center gap-2 rounded-[12px] text-[14px] font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-40"
          style={{
            paddingInline: "24px",
            paddingBlock: "12px",
            background: hasBalance ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.10)",
            color: hasBalance ? "hsl(var(--background))" : "rgba(255,255,255,0.38)",
          }}
        >
          Send Request
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>

        {/* Schedule footnote */}
        <p className="mt-3 text-[12px] text-foreground/35">Payouts processed every Saturday</p>
      </AvailableBalanceCard>

      <WithdrawalModal
        open={open}
        onClose={() => setOpen(false)}
        availableBalance={availableBalance}
        bankDetails={bankDetails}
      />
    </>
  );
}
