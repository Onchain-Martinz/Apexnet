"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { WithdrawalModal } from "@/components/lecturer/withdrawal-modal";

interface BalanceCardProps {
  availableBalance: number;
  bankDetails: {
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
  };
}

const naira = (amount: number) =>
  `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function BalanceCard({ availableBalance, bankDetails }: BalanceCardProps) {
  const [open, setOpen] = useState(false);
  const hasBalance = availableBalance > 0;

  return (
    <>
      {/* Keyframes injected once — no Tailwind config change needed */}
      <style>{`
        @keyframes apx-shimmer {
          0%   { transform: translateX(-160%) skewX(-12deg); opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateX(320%) skewX(-12deg); opacity: 0; }
        }
        .apx-shimmer {
          animation: apx-shimmer 4s ease-in-out 2.5s infinite;
        }
      `}</style>

      {/*
       * mx-[-12px] bleeds past the page padding on each side for a wider,
       * more integrated feel — not a floating box, part of the layout.
       */}
      <div
        className="relative overflow-hidden rounded-[30px] pt-5 px-7 pb-5 transition-transform duration-200 active:scale-[0.99] select-none mx-[-12px]"
        style={{
          background: "#07132A",
          boxShadow: [
            "0 8px 40px rgba(7,19,42,0.16)",
            "0 2px 8px rgba(7,19,42,0.10)",
            "inset 0 1px 0 rgba(255,255,255,0.08)",
            "inset 0 -1px 0 rgba(0,0,0,0.18)",
            "inset 0 0 60px rgba(0,0,20,0.22)",
          ].join(", "),
        }}
      >
        {/* Shimmer sweep */}
        <div className="apx-shimmer pointer-events-none absolute inset-y-0 w-[45%] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        {/* Primary radial glow — top-right */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 60%)",
            opacity: 0.38,
          }}
        />

        {/* Secondary glow — bottom-left */}
        <div
          className="pointer-events-none absolute -left-12 -bottom-12 h-48 w-48 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(90,110,220,0.35) 0%, transparent 65%)",
            opacity: 0.45,
          }}
        />

        {/* Decorative concentric rings — texture only, not illustration */}
        <div
          className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2"
          style={{ opacity: 0.04 }}
          aria-hidden
        >
          <div
            className="h-[108px] w-[108px] rounded-full"
            style={{ border: "1.5px solid white" }}
          >
            <div
              className="absolute inset-[18px] rounded-full"
              style={{ border: "1px solid white" }}
            >
              <div
                className="absolute inset-[18px] rounded-full"
                style={{ border: "1px solid white" }}
              />
            </div>
          </div>
        </div>

        {/* Label */}
        <p className="text-[11px] font-semibold tracking-[0.13em] uppercase text-white/45 mb-2">
          Available Next Payout
        </p>

        {/* Amount */}
        <p
          className="font-bold leading-none text-white"
          style={{ fontSize: "clamp(32px, 9vw, 42px)", letterSpacing: "-0.03em" }}
        >
          {naira(availableBalance)}
        </p>

        {/* Subtitle */}
        <p className="text-[13px] text-white/40 mt-1.5">
          {hasBalance ? "Ready for Saturday payout" : "No settled balance available yet"}
        </p>

        {/* Separator */}
        <div className="mt-4 mb-4 border-t border-white/[0.08]" />

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
            color: hasBalance ? "#07132A" : "rgba(255,255,255,0.38)",
          }}
        >
          Send Request
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>

        {/* Schedule footnote */}
        <p className="mt-3 text-[12px] text-white/35">Payouts processed every Saturday</p>
      </div>

      <WithdrawalModal
        open={open}
        onClose={() => setOpen(false)}
        availableBalance={availableBalance}
        bankDetails={bankDetails}
      />
    </>
  );
}
