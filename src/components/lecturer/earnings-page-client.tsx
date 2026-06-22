"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { BookOpen, Check, X, ChevronRight, Copy, Users, ShoppingBag, Wallet, Search } from "lucide-react";
import type { WithdrawalStatus } from "@prisma/client";
import { coverUrl } from "@/lib/utils/cover-url";

// ── Types ─────────────────────────────────────────────────────────────────────

export type StudentPurchase = {
  bookId: string;
  bookTitle: string;
  coverImageKey: string | null;
  studentName: string | null;
  amount: number;
  paidAt: string; // ISO
};

export type RecentSale = {
  bookId: string;
  bookTitle: string;
  coverImageKey: string | null;
  amount: number;
  paidAt: string; // ISO
};

export type WithdrawalRecord = {
  id: string;
  amount: number;
  status: WithdrawalStatus;
  createdAt: string; // ISO
  transferReference: string | null;
};

export type EarningsData = {
  totalNetRevenue: number;
  currentMonthRevenue: number;
  currentMonthName: string;
  studentPurchases: StudentPurchase[];
  withdrawals: WithdrawalRecord[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const naira = (n: number) =>
  `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const nairaCompact = (n: number) =>
  `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs === 1 ? "1 hour" : hrs + " hours"} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

// ── Adaptive progress color ───────────────────────────────────────────────────

function progressColor(pct: number): { fill: string; glow: string } {
  if (pct >= 100) return { fill: "#07132A", glow: "rgba(7,19,42,0.22)" };
  if (pct >= 80)  return { fill: "#4ADE80", glow: "rgba(74,222,128,0.28)" };
  if (pct >= 50)  return { fill: "#FBBF24", glow: "rgba(251,191,36,0.28)" };
  return                { fill: "#F87171", glow: "rgba(248,113,113,0.22)" };
}

// ── Withdrawal badge ──────────────────────────────────────────────────────────

const W_STYLES: Record<WithdrawalStatus, string> = {
  PENDING:    "bg-[#F4F4F5] text-[#71717A]",
  APPROVED:   "bg-[#DCFCE7] text-[#16A34A]",
  PROCESSING: "bg-[#EEF2FF] text-[#4F46E5]",
  PAID:       "bg-[#DCFCE7] text-[#16A34A]",
  FAILED:     "bg-[#FEE2E2] text-[#DC2626]",
  REJECTED:   "bg-[#FEE2E2] text-[#DC2626]",
};

const W_LABELS: Record<WithdrawalStatus, string> = {
  PENDING:    "Pending",
  APPROVED:   "Approved",
  PROCESSING: "Processing",
  PAID:       "Paid",
  FAILED:     "Failed",
  REJECTED:   "Rejected",
};

function WithdrawalBadge({ status }: { status: WithdrawalStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${W_STYLES[status]}`}>
      {W_LABELS[status]}
    </span>
  );
}

// ── Bottom sheet scaffold — locks body scroll while open ──────────────────────

function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        className={[
          "fixed inset-0 z-40 bg-black/25 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal
        aria-label={label}
        className={[
          "fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_-4px_40px_rgba(0,0,0,0.10)]",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          open ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
        style={{ maxHeight: "85vh" }}
      >
        {children}
      </div>
    </>
  );
}

function SheetHandle() {
  return (
    <div className="flex flex-shrink-0 justify-center pt-3 pb-1">
      <div className="h-1 w-10 rounded-full bg-[#E2E8F0]" />
    </div>
  );
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex flex-shrink-0 items-center justify-between border-b border-[#F4F4F5] px-5 py-3">
      <h3 className="text-[16px] font-semibold text-[#0F172A]">{title}</h3>
      <button
        type="button"
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F4F4F5] transition-colors duration-100 active:bg-[#E5E7EB]"
        aria-label="Close"
      >
        <X className="h-4 w-4 text-[#64748B]" />
      </button>
    </div>
  );
}

// ── 1. Net Revenue Card — silver / titanium ───────────────────────────────────

function NetRevenueCard({ revenue }: { revenue: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-[28px] px-6 py-7 select-none"
      style={{
        background: "linear-gradient(160deg, #F9F9F9 0%, #F0F0F0 50%, #E7E7E7 100%)",
        boxShadow: [
          "0 8px 32px rgba(0,0,0,0.09)",
          "0 2px 8px rgba(0,0,0,0.06)",
          "inset 0 1px 0 rgba(255,255,255,0.92)",
          "inset 0 -1px 0 rgba(0,0,0,0.04)",
        ].join(", "),
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[28px]"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 100%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.98), transparent)" }}
        aria-hidden
      />
      <p className="relative text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "#909090" }}>
        Net Revenue
      </p>
      <p
        className="relative mt-3 font-bold leading-none"
        style={{ fontSize: "clamp(30px, 8vw, 40px)", letterSpacing: "-0.025em", color: "#1A1A1A" }}
      >
        {naira(revenue)}
      </p>
      <p className="relative mt-2.5 text-[12px] leading-relaxed" style={{ color: "#999999" }}>
        Lifetime earnings after Apex platform fee (8.5%)
      </p>
    </div>
  );
}

// ── 2. Monthly Goal — adaptive color, animated, remaining amount ──────────────

const DEFAULT_GOAL = 10_000;
const GOAL_KEY = "apex-monthly-goal";

function MonthlyGoalSection({
  currentRevenue,
  monthName,
}: {
  currentRevenue: number;
  monthName: string;
}) {
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(GOAL_KEY);
    if (saved) {
      const n = Number(saved);
      if (n > 0) setGoal(n);
    }
    const t = setTimeout(() => setAnimated(true), 150);
    return () => clearTimeout(t);
  }, []);

  function startEdit() {
    setInput(String(goal));
    setEditing(true);
  }

  function saveEdit() {
    const n = parseInt(input.replace(/[^0-9]/g, ""), 10);
    if (n > 0) {
      setGoal(n);
      localStorage.setItem(GOAL_KEY, String(n));
    }
    setEditing(false);
  }

  const rawPct = goal > 0 ? (currentRevenue / goal) * 100 : 0;
  const progressPct = Math.min(100, rawPct);
  const displayPct = Math.round(rawPct);
  const remaining = Math.max(0, goal - currentRevenue);
  const colors = progressColor(rawPct);

  return (
    <div className="rounded-[22px] border border-[#EAEAEA] bg-white px-5 py-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[14px] font-semibold text-[#0F172A]">{monthName} Goal</p>
        <button
          type="button"
          onClick={startEdit}
          className="text-[12px] font-medium text-[#94A3B8] transition-colors duration-150 hover:text-[#475569]"
        >
          Edit
        </button>
      </div>

      {/* Amounts + percentage */}
      <p className="text-[13px] text-[#475569] mb-0.5">
        <span className="text-[18px] font-bold text-[#0F172A]">{nairaCompact(currentRevenue)}</span>
        {" "}of {nairaCompact(goal)}
      </p>
      <p className="text-[13px] font-semibold mb-3" style={{ color: colors.fill }}>
        {displayPct}% Complete
      </p>

      {/* Animated progress bar */}
      <div className="relative h-[8px] overflow-hidden rounded-full bg-[#EBEBEB]">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: animated ? `${progressPct}%` : "0%",
            backgroundColor: colors.fill,
            boxShadow: `0 0 12px 2px ${colors.glow}`,
            transition:
              "width 900ms cubic-bezier(0.25,0.46,0.45,0.94), background-color 500ms ease, box-shadow 500ms ease",
          }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)",
            }}
          />
        </div>
      </div>

      {/* Remaining */}
      <p className="mt-2.5 text-[12px] text-[#94A3B8]">
        {remaining > 0 ? (
          <>
            <span className="font-semibold text-[#475569]">{nairaCompact(remaining)}</span> remaining
          </>
        ) : (
          <span className="font-semibold" style={{ color: colors.fill }}>Goal reached</span>
        )}
      </p>

      {/* Inline edit */}
      {editing && (
        <div className="mt-4 flex items-end gap-2">
          <div className="flex-1">
            <p className="mb-1.5 text-[11px] font-medium text-[#94A3B8]">Monthly goal (₦)</p>
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="w-full rounded-[10px] border border-[#E2E8F0] bg-[#FAFAFA] px-3 py-2.5 text-[14px] font-semibold text-[#0F172A] outline-none focus:border-[#07132A] focus:bg-white"
              autoFocus
              placeholder="10000"
            />
          </div>
          <button
            type="button"
            onClick={saveEdit}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-[#07132A] text-white transition-all duration-150 active:scale-[0.97]"
            aria-label="Save"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-[#E2E8F0] transition-all duration-150 active:scale-[0.97]"
            aria-label="Cancel"
          >
            <X className="h-4 w-4 text-[#64748B]" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── 3. Action card ────────────────────────────────────────────────────────────

function ActionCard({
  icon: Icon,
  title,
  description,
  count,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-[20px] border border-[#EAEAEA] bg-white p-4 text-left shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all duration-150 active:scale-[0.98] hover:border-[#D8DCE3]"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-[#F4F5F7]">
        <Icon className="h-5 w-5 text-[#475569]" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-[#0F172A]">{title}</p>
        <p className="mt-0.5 text-[12px] text-[#94A3B8]">{description}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {count > 0 && (
          <span className="text-[12px] font-semibold text-[#94A3B8]">{count}</span>
        )}
        <ChevronRight className="h-4 w-4 text-[#C0C7D4]" aria-hidden />
      </div>
    </button>
  );
}

// ── Student Purchases — grouped by textbook ───────────────────────────────────

type TextbookGroup = {
  bookId: string;
  bookTitle: string;
  coverImageKey: string | null;
  revenue: number;
  purchaseCount: number;
  buyers: string[];
};

// ── Grid card — compact Apple Files style ────────────────────────────────────

function TextbookGridCard({
  group,
  onClick,
}: {
  group: TextbookGroup;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col overflow-hidden rounded-[12px] border border-[#EAEAEA] bg-white text-left shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all duration-150 active:scale-[0.96] active:bg-[#FAFAFA]"
    >
      {/* Cover thumbnail — fixed height, centered */}
      <div className="flex w-full items-center justify-center bg-[#F4F5F7] py-3">
        <div
          className="relative overflow-hidden rounded-[5px] shadow-[0_1px_4px_rgba(0,0,0,0.14)]"
          style={{ width: 42, height: 56 }}
        >
          {coverUrl(group.bookId, group.coverImageKey) ? (
            <Image
              src={coverUrl(group.bookId, group.coverImageKey)!}
              alt={group.bookTitle}
              fill
              sizes="42px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#E8EAF0]">
              <BookOpen className="h-4 w-4 text-[#C0C7D4]" aria-hidden />
            </div>
          )}
        </div>
      </div>

      {/* Info — dense */}
      <div className="flex flex-col gap-0.5 px-2 pb-2.5 pt-2">
        <p className="line-clamp-2 text-[11px] font-semibold leading-[1.35] text-[#0F172A]">
          {group.bookTitle}
        </p>
        <p className="mt-1 text-[11px] font-semibold leading-none text-[#16A34A]">
          {nairaCompact(group.revenue)}
        </p>
        <p className="text-[10px] leading-none text-[#94A3B8]">
          {group.purchaseCount} {group.purchaseCount === 1 ? "sale" : "sales"}
        </p>
      </div>
    </button>
  );
}

// ── Book Detail Modal (second-layer sheet) ────────────────────────────────────

function BookDetailModal({
  group,
  open,
  onClose,
}: {
  group: TextbookGroup | null;
  open: boolean;
  onClose: () => void;
}) {
  const [toast, setToast] = useState(false);

  async function copyBuyerList() {
    if (!group) return;
    try {
      await navigator.clipboard.writeText(group.buyers.join("\n"));
      setToast(true);
      setTimeout(() => setToast(false), 2500);
    } catch {
      // no-op if clipboard unavailable
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          "fixed inset-0 z-[55] bg-black/35 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal
        aria-label="Book Details"
        className={[
          "fixed inset-x-0 bottom-0 z-[60] flex flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_-4px_40px_rgba(0,0,0,0.12)]",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          open ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
        style={{ maxHeight: "85vh" }}
      >
        {/* Handle */}
        <div className="flex flex-shrink-0 justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-[#E2E8F0]" />
        </div>

        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[#F4F4F5] px-5 py-3">
          <h3 className="text-[16px] font-semibold text-[#0F172A]">Book Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F4F4F5] transition-colors duration-100 active:bg-[#E5E7EB]"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-[#64748B]" />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          className="min-h-0 flex-1 overflow-y-auto pb-10"
          style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {group && (
            <div className="space-y-5 px-5 pt-6">
              {/* Book cover */}
              <div className="flex justify-center">
                <div
                  className="relative overflow-hidden rounded-[14px] bg-[#F0F1F3] shadow-[0_4px_20px_rgba(0,0,0,0.10)]"
                  style={{ width: 96, height: 128 }}
                >
                  {coverUrl(group.bookId, group.coverImageKey) ? (
                    <Image
                      src={coverUrl(group.bookId, group.coverImageKey)!}
                      alt={group.bookTitle}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <BookOpen className="h-8 w-8 text-[#C0C7D4]" aria-hidden />
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <p className="text-center text-[17px] font-bold leading-snug text-[#0F172A]">
                {group.bookTitle}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center rounded-[16px] border border-[#EAEAEA] px-4 py-4">
                  <p className="text-[15px] font-bold leading-none text-[#0F172A]">
                    {naira(group.revenue)}
                  </p>
                  <p className="mt-1.5 text-[11px] text-[#94A3B8]">Revenue Generated</p>
                </div>
                <div className="flex flex-col items-center rounded-[16px] border border-[#EAEAEA] px-4 py-4">
                  <p className="text-[15px] font-bold leading-none text-[#0F172A]">
                    {group.purchaseCount}
                  </p>
                  <p className="mt-1.5 text-[11px] text-[#94A3B8]">
                    {group.purchaseCount === 1 ? "Purchase" : "Purchases"}
                  </p>
                </div>
              </div>

              {/* Students */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#94A3B8]">
                  Students
                </p>
                <div className="overflow-hidden rounded-[16px] border border-[#EAEAEA]">
                  {group.buyers.map((name, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#F0F1F3]">
                          <Users className="h-3.5 w-3.5 text-[#94A3B8]" aria-hidden />
                        </div>
                        <p className="text-[14px] font-medium text-[#0F172A]">{name}</p>
                      </div>
                      {i < group.buyers.length - 1 && (
                        <div className="mx-4 border-t border-[#F4F4F5]" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Copy Buyer List */}
              <button
                type="button"
                onClick={copyBuyerList}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#E2E8F0] py-3.5 text-[14px] font-semibold text-[#475569] transition-all duration-150 active:scale-[0.98] active:bg-[#F8F9FA]"
              >
                <Copy className="h-4 w-4" aria-hidden />
                Copy Buyer List
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      <div
        className={[
          "fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-[#0F172A] px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg transition-all duration-300",
          toast ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2",
        ].join(" ")}
        aria-live="polite"
      >
        Buyer list copied
      </div>
    </>
  );
}

// ── Modal: Student Purchases — compact adaptive grid ─────────────────────────

function StudentPurchasesModal({
  purchases,
  open,
  onClose,
}: {
  purchases: StudentPurchase[];
  open: boolean;
  onClose: () => void;
}) {
  const [selectedGroup, setSelectedGroup] = useState<TextbookGroup | null>(null);
  const [query, setQuery] = useState("");

  // Reset search when modal closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedGroup(null);
    }
  }, [open]);

  const groups = useMemo<TextbookGroup[]>(() => {
    const map = new Map<string, TextbookGroup>();
    for (const p of purchases) {
      const existing = map.get(p.bookId);
      if (existing) {
        existing.revenue += p.amount;
        existing.purchaseCount++;
        existing.buyers.push(p.studentName ?? "Anonymous");
      } else {
        map.set(p.bookId, {
          bookId: p.bookId,
          bookTitle: p.bookTitle,
          coverImageKey: p.coverImageKey,
          revenue: p.amount,
          purchaseCount: 1,
          buyers: [p.studentName ?? "Anonymous"],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [purchases]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.bookTitle.toLowerCase().includes(q));
  }, [groups, query]);

  return (
    <>
      <Sheet open={open} onClose={onClose} label="Student Purchases">
        <SheetHandle />
        <SheetHeader title="Student Purchases" onClose={onClose} />

        {/* Search bar — sticky below header */}
        {groups.length > 0 && (
          <div className="flex-shrink-0 px-4 py-2.5 border-b border-[#F4F4F5]">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search textbooks…"
                className="w-full rounded-[10px] bg-[#F4F5F7] py-2 pl-9 pr-3 text-[13px] text-[#0F172A] placeholder-[#94A3B8] outline-none transition-colors duration-150 focus:bg-[#EBEBEB]"
              />
            </div>
          </div>
        )}

        <div
          className="min-h-0 flex-1 overflow-y-auto"
          style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {groups.length === 0 ? (
            /* No purchases at all */
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <BookOpen className="h-8 w-8 text-[#CBD5E1]" aria-hidden />
              <p className="text-[13px] text-[#94A3B8]">No purchases yet</p>
            </div>
          ) : filtered.length === 0 ? (
            /* Search returned nothing */
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="text-[28px]" aria-hidden>📚</span>
              <p className="text-[14px] font-semibold text-[#0F172A]">No matching textbooks found</p>
              <p className="text-[12px] text-[#94A3B8]">Try another search term</p>
            </div>
          ) : (
            /* Auto-fill grid: 3 cols on most phones, 2 on very small */
            <div
              className="p-3 pb-10"
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}
            >
              {filtered.map((group) => (
                <TextbookGridCard
                  key={group.bookId}
                  group={group}
                  onClick={() => setSelectedGroup(group)}
                />
              ))}
            </div>
          )}
        </div>
      </Sheet>

      <BookDetailModal
        group={selectedGroup}
        open={selectedGroup !== null}
        onClose={() => setSelectedGroup(null)}
      />
    </>
  );
}

// ── Modal: Recent Sales ───────────────────────────────────────────────────────

function RecentSalesModal({
  sales,
  open,
  onClose,
}: {
  sales: RecentSale[];
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label="Recent Sales">
      <SheetHandle />
      <SheetHeader title="Recent Sales" onClose={onClose} />

      <div
        className="min-h-0 flex-1 overflow-y-auto pb-10"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {sales.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <ShoppingBag className="h-8 w-8 text-[#CBD5E1]" aria-hidden />
            <p className="text-[13px] text-[#94A3B8]">No sales yet</p>
          </div>
        ) : (
          sales.map((sale, i) => (
            <div key={`${sale.paidAt}-${i}`}>
              <div className="flex items-center gap-3 px-5 py-4">
                <div
                  className="relative flex-shrink-0 overflow-hidden rounded-[8px] bg-[#F0F1F3]"
                  style={{ width: 40, height: 53 }}
                >
                  {coverUrl(sale.bookId, sale.coverImageKey) ? (
                    <Image
                      src={coverUrl(sale.bookId, sale.coverImageKey)!}
                      alt={sale.bookTitle}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <BookOpen className="h-4 w-4 text-[#C0C7D4]" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#0F172A]">{sale.bookTitle}</p>
                  <p className="mt-0.5 text-[12px] text-[#94A3B8]">{relativeTime(sale.paidAt)}</p>
                </div>
                <p className="flex-shrink-0 text-[14px] font-semibold text-[#16A34A]">
                  +{naira(sale.amount)}
                </p>
              </div>
              {i < sales.length - 1 && <div className="mx-5 border-t border-[#F4F4F5]" />}
            </div>
          ))
        )}
      </div>
    </Sheet>
  );
}

// ── Modal: Withdrawals ────────────────────────────────────────────────────────

function WithdrawalsModal({
  withdrawals,
  open,
  onClose,
}: {
  withdrawals: WithdrawalRecord[];
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label="Withdrawals">
      <SheetHandle />
      <SheetHeader title="Withdrawals" onClose={onClose} />

      <div
        className="min-h-0 flex-1 overflow-y-auto pb-10"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {withdrawals.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Wallet className="h-8 w-8 text-[#CBD5E1]" aria-hidden />
            <p className="text-[13px] text-[#94A3B8]">No withdrawals yet</p>
          </div>
        ) : (
          withdrawals.map((w, i) => (
            <div key={w.id}>
              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[15px] font-semibold text-[#0F172A]">{naira(w.amount)}</p>
                  <p className="text-[12px] text-[#94A3B8]">{formatDate(w.createdAt)}</p>
                  {w.transferReference && (
                    <p className="truncate font-mono text-[11px] text-[#C0C7D4]">
                      {w.transferReference}
                    </p>
                  )}
                </div>
                <WithdrawalBadge status={w.status} />
              </div>
              {i < withdrawals.length - 1 && <div className="mx-5 border-t border-[#F4F4F5]" />}
            </div>
          ))
        )}
      </div>
    </Sheet>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

type ModalKey = "purchases" | "sales" | "withdrawals" | null;

export function EarningsPageClient({ data }: { data: EarningsData }) {
  const { totalNetRevenue, currentMonthRevenue, currentMonthName, studentPurchases, withdrawals } = data;
  const [modal, setModal] = useState<ModalKey>(null);

  const recentSales = useMemo(() => studentPurchases, [studentPurchases]);

  return (
    <>
      <div className="mx-auto max-w-lg px-page pb-16 pt-12">
        <header className="mb-8">
          <h1
            className="font-bold leading-none tracking-tight text-[#0F172A]"
            style={{ fontSize: "clamp(22px, 6vw, 28px)" }}
          >
            Earnings
          </h1>
        </header>

        <div className="space-y-4">
          <NetRevenueCard revenue={totalNetRevenue} />

          <MonthlyGoalSection
            currentRevenue={currentMonthRevenue}
            monthName={currentMonthName}
          />

          <ActionCard
            icon={Users}
            title="Student Purchases"
            description="See everyone who purchased your textbooks"
            count={studentPurchases.length}
            onClick={() => setModal("purchases")}
          />
          <ActionCard
            icon={ShoppingBag}
            title="Recent Sales"
            description="View your latest sales activity"
            count={recentSales.length}
            onClick={() => setModal("sales")}
          />
          <ActionCard
            icon={Wallet}
            title="Withdrawals"
            description="View withdrawal history and payout status"
            count={withdrawals.length}
            onClick={() => setModal("withdrawals")}
          />
        </div>
      </div>

      <StudentPurchasesModal
        purchases={studentPurchases}
        open={modal === "purchases"}
        onClose={() => setModal(null)}
      />
      <RecentSalesModal
        sales={recentSales}
        open={modal === "sales"}
        onClose={() => setModal(null)}
      />
      <WithdrawalsModal
        withdrawals={withdrawals}
        open={modal === "withdrawals"}
        onClose={() => setModal(null)}
      />
    </>
  );
}
