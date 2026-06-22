"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type Bank = {
  name: string;
  code: string;
  slug: string;
};

export type BankVerificationData = {
  bankCode: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bankAccountVerifiedAt: string | null;
};

export function BankVerificationPanel({ initial }: { initial: BankVerificationData }) {
  const [data, setData] = useState<BankVerificationData>(initial);
  const [editing, setEditing] = useState(!initial.bankAccountVerifiedAt);

  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState<string | null>(null);

  const [bankCode, setBankCode] = useState(initial.bankCode);
  const [accountNumber, setAccountNumber] = useState(initial.bankAccountNumber);

  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing || banks.length > 0) return;

    let cancelled = false;
    setBanksLoading(true);
    setBanksError(null);

    fetch("/api/lecturer/banks")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) {
          setBanksError(json.error);
          return;
        }
        setBanks(json.banks ?? []);
      })
      .catch(() => {
        if (!cancelled) setBanksError("Failed to load banks");
      })
      .finally(() => {
        if (!cancelled) setBanksLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [editing, banks.length]);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setError(null);

    try {
      const res = await fetch("/api/lecturer/profile/verify-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankCode, accountNumber }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      setData({
        bankCode: json.profile.bankCode ?? "",
        bankName: json.profile.bankName ?? "",
        bankAccountNumber: json.profile.bankAccountNumber ?? "",
        bankAccountName: json.profile.bankAccountName ?? "",
        bankAccountVerifiedAt: json.profile.bankAccountVerifiedAt ?? null,
      });
      setEditing(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  function startEdit() {
    setBankCode(data.bankCode);
    setAccountNumber(data.bankAccountNumber);
    setError(null);
    setEditing(true);
  }

  // ── Verified, view mode ───────────────────────────────────────────────────
  if (!editing && data.bankAccountVerifiedAt) {
    return (
      <section className="space-y-element rounded-card border border-card-border bg-card p-card shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-muted-foreground">Withdrawal Account</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[12px] font-semibold text-success">
            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
            Verified
          </span>
        </div>

        <div>
          <p className="text-[15px] font-semibold text-foreground">{data.bankAccountName}</p>
          <p className="text-[13px] text-muted-foreground">
            {data.bankName} · {data.bankAccountNumber}
          </p>
        </div>

        <Button type="button" variant="outline" size="lg" onClick={startEdit}>
          Change Bank Account
        </Button>
      </section>
    );
  }

  // ── Not configured / editing ─────────────────────────────────────────────
  return (
    <section className="space-y-element rounded-card border border-card-border bg-card p-card shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">Withdrawal Account</p>
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[12px] font-semibold text-muted-foreground">
          Not Configured
        </span>
      </div>

      <form onSubmit={handleVerify} className="space-y-element">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bankCode" className="text-[13px] font-medium text-foreground">
            Bank
          </label>
          <select
            id="bankCode"
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            disabled={verifying || banksLoading}
            className={cn(
              "h-12 w-full rounded-input border bg-background px-4",
              "text-[16px] sm:text-[15px] text-foreground",
              "transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground",
              "border-border",
            )}
          >
            <option value="">{banksLoading ? "Loading banks…" : "Select a bank"}</option>
            {banks.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
          {banksError && <p className="text-caption text-destructive">{banksError}</p>}
        </div>

        <Input
          label="Account Number"
          id="bankAccountNumber"
          placeholder="e.g. 0123456789"
          inputMode="numeric"
          maxLength={10}
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
          disabled={verifying}
        />

        {error && (
          <div className="rounded-input border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-[13px] text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-element">
          {data.bankAccountVerifiedAt && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setEditing(false)}
              disabled={verifying}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="lg"
            className="flex-1"
            loading={verifying}
            disabled={verifying || !bankCode || accountNumber.length !== 10}
          >
            {verifying ? "Verifying…" : "Verify"}
          </Button>
        </div>
      </form>
    </section>
  );
}
