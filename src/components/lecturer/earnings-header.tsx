"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WithdrawalModal } from "@/components/lecturer/withdrawal-modal";

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

interface EarningsHeaderProps {
  earnings: number;
  availableBalance: number;
  bankDetails: {
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
  };
}

export function EarningsHeader({ earnings, availableBalance, bankDetails }: EarningsHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-card border border-card-border bg-card p-card shadow-card">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[13px] text-muted-foreground">Your Earnings</p>
        <Button size="sm" onClick={() => setOpen(true)}>
          Withdraw
        </Button>
      </div>
      <p className="text-[32px] font-bold leading-tight text-foreground">
        {naira(earnings)}
      </p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Net earnings after Apex platform fee (8.5%).
      </p>
      <p className="mt-2 text-[13px] text-muted-foreground">
        Available Balance <span className="font-semibold text-foreground">{naira(availableBalance)}</span>
      </p>

      <WithdrawalModal
        open={open}
        onClose={() => setOpen(false)}
        availableBalance={availableBalance}
        bankDetails={bankDetails}
      />
    </section>
  );
}
