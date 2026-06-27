"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Search } from "lucide-react";
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

  const [bankSearch, setBankSearch] = useState("");
  const [showBankResults, setShowBankResults] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the search box with the already-selected bank's name once the bank
  // list has loaded (e.g. re-opening "Change Bank Account" with a code set).
  useEffect(() => {
    if (banks.length === 0 || !bankCode || bankSearch) return;
    const match = banks.find((b) => b.code === bankCode);
    if (match) setBankSearch(match.name);
  }, [banks, bankCode, bankSearch]);

  const filteredBanks = banks.filter((b) =>
    b.name.toLowerCase().includes(bankSearch.trim().toLowerCase()),
  );

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
    setBankSearch("");
    setShowBankResults(false);
    setError(null);
    setEditing(true);
  }

  // ── Verified, view mode ───────────────────────────────────────────────────
  if (!editing && data.bankAccountVerifiedAt) {
    return (
      <section className="space-y-element rounded-card border border-card-border bg-card p-card shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-muted-foreground">Payout Account</p>
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
        <p className="text-[13px] text-muted-foreground">Payout Account</p>
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[12px] font-semibold text-muted-foreground">
          Not Configured
        </span>
      </div>

      <form onSubmit={handleVerify} className="space-y-element">
        <div
          className="relative flex flex-col gap-1.5"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowBankResults(false);
          }}
        >
          <label htmlFor="bankSearch" className="text-[13px] font-medium text-foreground">
            Bank
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="bankSearch"
              type="text"
              autoComplete="off"
              placeholder={banksLoading ? "Loading banks…" : "Search for your bank"}
              value={bankSearch}
              onChange={(e) => {
                setBankSearch(e.target.value);
                setBankCode("");
                setShowBankResults(true);
              }}
              onFocus={() => setShowBankResults(true)}
              disabled={verifying || banksLoading}
              className={cn(
                "h-12 w-full rounded-input border bg-input pl-11 pr-4",
                "text-[16px] sm:text-[15px] text-foreground placeholder:text-muted-foreground",
                "transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary focus:shadow-glow",
                "border-border",
              )}
            />
          </div>

          {showBankResults && (
            <div className="max-h-56 overflow-y-auto rounded-input border border-border bg-card divide-y divide-border">
              {filteredBanks.length === 0 ? (
                <p className="px-4 py-3 text-[13px] text-muted-foreground">No banks found</p>
              ) : (
                filteredBanks.map((bank) => (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => {
                      setBankCode(bank.code);
                      setBankSearch(bank.name);
                      setShowBankResults(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-3 text-left text-[14px] transition-colors active:bg-muted",
                      bankCode === bank.code ? "bg-muted font-semibold text-foreground" : "text-foreground",
                    )}
                  >
                    {bank.name}
                  </button>
                ))
              )}
            </div>
          )}
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
