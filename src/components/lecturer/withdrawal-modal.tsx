"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

interface WithdrawalModalProps {
  open: boolean;
  onClose: () => void;
  availableBalance: number;
  bankDetails: {
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
  };
}

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

export function WithdrawalModal({ open, onClose, availableBalance, bankDetails }: WithdrawalModalProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasBankDetails = Boolean(
    bankDetails.bankName && bankDetails.bankAccountNumber && bankDetails.bankAccountName,
  );

  function handleClose() {
    setAmount("");
    setError(null);
    onClose();
  }

  async function handleContinue() {
    setError(null);

    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (value > availableBalance) {
      setError("Amount exceeds available next payout");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/lecturer/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to submit request");
        return;
      }

      setAmount("");
      onClose();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Request Saturday Payout">
      <div className="space-y-element">
        <div className="rounded-card border border-card-border bg-muted/40 p-card">
          <p className="text-[14px] font-semibold text-foreground">
            Payouts are processed every Saturday.
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            This request joins the payout queue. Only settled earnings are available for payout.
          </p>
        </div>

        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          label="Amount (₦)"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={error ?? undefined}
          hint={`Available next payout: ${naira(availableBalance)}`}
          disabled={loading}
          autoFocus
        />

        <div className="rounded-card border border-card-border bg-muted/40 p-card">
          <p className="mb-2 text-[13px] font-medium text-muted-foreground">
            Payout to
          </p>
          {hasBankDetails ? (
            <div className="space-y-1">
              <p className="text-[14px] font-semibold text-foreground">
                {bankDetails.bankAccountName}
              </p>
              <p className="text-[13px] text-muted-foreground">
                {bankDetails.bankName} · {bankDetails.bankAccountNumber}
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              No bank details on file. Add your bank details in your profile before requesting a payout.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            loading={loading}
            disabled={loading || availableBalance <= 0 || !hasBankDetails}
            onClick={handleContinue}
          >
            Send Request
          </Button>
        </div>
      </div>
    </Modal>
  );
}
