"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { BookOpen, Check, X, ChevronRight, Copy, Users, Wallet, Search } from "lucide-react";
import type { WithdrawalStatus } from "@prisma/client";
import { coverUrl } from "@/lib/utils/cover-url";
import { AvailableBalanceCard } from "@/components/lecturer/available-balance-card";

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
  pendingSettlement: number;
  availableNextPayout: number;
  lastPayoutDate: string | null;
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

// ── Adaptive progress color ───────────────────────────────────────────────────

// Hex literals here are the same values as --primary/--success/--warning/
// --destructive — kept literal (not Tailwind classes) because this function
// feeds an inline style for a dynamically computed color, which static
// utility classes can't express.
function progressColor(pct: number): { fill: string; glow: string } {
  if (pct >= 100) return { fill: "#3D40F3", glow: "rgba(61,64,243,0.35)" };
  if (pct >= 80)  return { fill: "#10B981", glow: "rgba(16,185,129,0.28)" };
  if (pct >= 50)  return { fill: "#F59E0B", glow: "rgba(245,158,11,0.28)" };
  return                { fill: "#EF4444", glow: "rgba(239,68,68,0.22)" };
}

// ── Withdrawal badge ──────────────────────────────────────────────────────────

const W_STYLES: Record<WithdrawalStatus, string> = {
  PENDING:    "bg-muted text-muted-foreground",
  APPROVED:   "bg-success/10 text-success",
  PROCESSING: "bg-primary/10 text-primary",
  PAID:       "bg-success/10 text-success",
  FAILED:     "bg-destructive/10 text-destructive",
  REJECTED:   "bg-destructive/10 text-destructive",
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
  variant = "sheet",
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  // "dialog" renders this as a centered, max-width modal instead of a
  // bottom-docked sheet — used by Student Purchases, which (along with Book
  // Details and Book Metrics) was converted away from the bottom-sheet
  // pattern. Recent Sales / Payout Requests keep the default "sheet".
  variant?: "sheet" | "dialog";
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

  const panel = (
    <div
      role="dialog"
      aria-modal
      aria-label={label}
      onClick={variant === "dialog" ? (e) => e.stopPropagation() : undefined}
      className={
        variant === "dialog"
          ? [
              "flex w-full max-w-md flex-col overflow-hidden rounded-[24px] glass-surface-elevated",
              "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
            ].join(" ")
          : [
              "fixed inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-50 flex flex-col overflow-hidden rounded-[24px] glass-surface-elevated",
              "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              open ? "translate-y-0" : "translate-y-full",
            ].join(" ")
      }
      style={{ maxHeight: "85vh" }}
    >
      {children}
    </div>
  );

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
      {variant === "dialog" ? (
        <div
          className={[
            "fixed inset-0 z-50 flex items-center justify-center p-4",
            open ? "" : "pointer-events-none",
          ].join(" ")}
          onClick={onClose}
        >
          {panel}
        </div>
      ) : (
        panel
      )}
    </>
  );
}

function SheetHandle() {
  return (
    <div className="flex flex-shrink-0 justify-center pt-3 pb-1">
      <div className="h-1 w-10 rounded-full bg-foreground/20" />
    </div>
  );
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-5 py-3">
      <h3 className="text-[16px] font-semibold text-foreground">{title}</h3>
      <button
        type="button"
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-muted transition-colors duration-100 active:bg-muted/60"
        aria-label="Close"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

// ── 1. Net Revenue Card — silver / titanium ───────────────────────────────────

// AvailableBalanceCard (the hero card) now lives in
// @/components/lecturer/available-balance-card — shared with the /lecturer
// dashboard root's hero card so both pages render the balance figures from
// one source instead of two copies.

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
    <div className="glass-surface rounded-[22px] px-5 py-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[14px] font-semibold text-foreground">{monthName} Goal</p>
        <button
          type="button"
          onClick={startEdit}
          className="text-[12px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          Edit
        </button>
      </div>

      {/* Amounts + percentage */}
      <p className="text-[13px] text-muted-foreground mb-0.5">
        <span className="text-[18px] font-bold text-foreground">{nairaCompact(currentRevenue)}</span>
        {" "}of {nairaCompact(goal)}
      </p>
      <p className="text-[13px] font-semibold mb-3" style={{ color: colors.fill }}>
        {displayPct}% Complete
      </p>

      {/* Animated progress bar */}
      <div className="relative h-[8px] overflow-hidden rounded-full bg-muted">
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
      <p className="mt-2.5 text-[12px] text-muted-foreground">
        {remaining > 0 ? (
          <>
            <span className="font-semibold text-foreground">{nairaCompact(remaining)}</span> remaining
          </>
        ) : (
          <span className="font-semibold" style={{ color: colors.fill }}>Goal reached</span>
        )}
      </p>

      {/* Inline edit */}
      {editing && (
        <div className="mt-4 flex items-end gap-2">
          <div className="flex-1">
            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Monthly goal (₦)</p>
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="w-full rounded-[10px] border border-border bg-input px-3 py-2.5 text-[14px] font-semibold text-foreground outline-none focus:border-primary focus:shadow-glow"
              autoFocus
              placeholder="10000"
            />
          </div>
          <button
            type="button"
            onClick={saveEdit}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground transition-all duration-150 active:scale-[0.97]"
            aria-label="Save"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-border transition-all duration-150 active:scale-[0.97]"
            aria-label="Cancel"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── 3. Sales Overview — inline 7-day revenue chart ────────────────────────────

const CHART_HEIGHT = 120;
const CHART_DAYS = 7;

interface DayBucket {
  label: string;
  revenue: number;
}

interface SalesAggregate {
  buckets: DayBucket[];
  totalRevenue: number;
  salesCount: number;
}

// Aggregates by local calendar day (not UTC) so "today"'s bar matches what
// the lecturer actually sees on their device. Sales outside the window are
// silently excluded — `revenueByDay` only ever has keys for the last
// `days` calendar days, so anything older never matches `.has(key)`.
function aggregateByDay(sales: RecentSale[], days: number): SalesAggregate {
  const now = new Date();
  const dayKeys: string[] = [];
  const revenueByDay = new Map<string, number>();

  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i).toDateString();
    dayKeys.push(key);
    revenueByDay.set(key, 0);
  }

  let totalRevenue = 0;
  let salesCount = 0;

  for (const sale of sales) {
    const d = new Date(sale.paidAt);
    const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
    if (!revenueByDay.has(key)) continue;
    revenueByDay.set(key, revenueByDay.get(key)! + sale.amount);
    totalRevenue += sale.amount;
    salesCount += 1;
  }

  const buckets = dayKeys.map((key) => ({
    label: new Date(key).toLocaleDateString("en-NG", { weekday: "short" }),
    revenue: revenueByDay.get(key) ?? 0,
  }));

  return { buckets, totalRevenue, salesCount };
}

function SalesOverviewSection({ sales }: { sales: RecentSale[] }) {
  const { buckets, totalRevenue, salesCount } = useMemo(
    () => aggregateByDay(sales, CHART_DAYS),
    [sales],
  );
  const avgSale = salesCount > 0 ? totalRevenue / salesCount : 0;
  const hasEnoughData = salesCount >= 2;
  const maxRevenue = Math.max(...buckets.map((b) => b.revenue), 1);

  return (
    <div className="glass-surface rounded-[22px] px-5 py-5">
      <p className="mb-4 text-[14px] font-semibold text-foreground">Sales Overview</p>

      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Revenue · Last 7 Days
      </p>
      <p
        className="mt-1 font-bold leading-none text-foreground"
        style={{ fontSize: "28px", letterSpacing: "-0.02em" }}
      >
        {naira(totalRevenue)}
      </p>

      {hasEnoughData ? (
        <div className="mt-4 flex items-end gap-2" style={{ height: CHART_HEIGHT }}>
          {buckets.map((bucket, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
              <div
                className="w-full max-w-[28px] rounded-t-[5px] rounded-b-[2px] bg-success"
                style={{ height: Math.max(4, (bucket.revenue / maxRevenue) * CHART_HEIGHT) }}
              />
              <p className="mt-2 text-[10px] font-medium text-muted-foreground">{bucket.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="mt-4 flex flex-col items-center justify-center rounded-[16px] border border-card-border bg-muted px-6 text-center"
          style={{ height: CHART_HEIGHT }}
        >
          <p className="text-[13px] text-muted-foreground">
            Sales data will appear here as purchases come in.
          </p>
        </div>
      )}

      <div className="mt-[18px] grid grid-cols-3 divide-x divide-card-border overflow-hidden rounded-[18px] border border-card-border">
        <div className="flex flex-col items-center px-3 py-5">
          <p className="text-[15px] font-bold leading-none text-foreground">{naira(totalRevenue)}</p>
          <p className="mt-1.5 text-[11px] text-muted-foreground">Revenue</p>
        </div>
        <div className="flex flex-col items-center px-3 py-5">
          <p className="text-[15px] font-bold leading-none text-foreground">{salesCount}</p>
          <p className="mt-1.5 text-[11px] text-muted-foreground">Sales</p>
        </div>
        <div className="flex flex-col items-center px-3 py-5">
          <p className="text-[15px] font-bold leading-none text-foreground">{naira(avgSale)}</p>
          <p className="mt-1.5 text-[11px] text-muted-foreground">Avg. Sale</p>
        </div>
      </div>
    </div>
  );
}

// ── 4. Action card ────────────────────────────────────────────────────────────

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
      className="flex w-full items-center gap-4 rounded-[20px] border border-card-border bg-card p-4 text-left shadow-card transition-all duration-150 active:scale-[0.98] hover:border-foreground/15"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {count > 0 && (
          <span className="text-[12px] font-semibold text-muted-foreground">{count}</span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
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
      className="flex flex-col overflow-hidden rounded-[12px] border border-card-border bg-card text-left shadow-card transition-all duration-150 active:scale-[0.96] active:bg-muted/50"
    >
      {/* Cover thumbnail — fixed height, centered */}
      <div className="flex w-full items-center justify-center bg-muted py-3">
        <div
          className="relative overflow-hidden rounded-[5px] shadow-card"
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
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
          )}
        </div>
      </div>

      {/* Info — dense */}
      <div className="flex flex-col gap-0.5 px-2 pb-2.5 pt-2">
        <p className="line-clamp-2 text-[11px] font-semibold leading-[1.35] text-foreground">
          {group.bookTitle}
        </p>
        <p className="mt-1 text-[11px] font-semibold leading-none text-success">
          {nairaCompact(group.revenue)}
        </p>
        <p className="text-[10px] leading-none text-muted-foreground">
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

      {/* Centered dialog */}
      <div
        className={[
          "fixed inset-0 z-[60] flex items-center justify-center p-4",
          open ? "" : "pointer-events-none",
        ].join(" ")}
        onClick={onClose}
      >
      <div
        role="dialog"
        aria-modal
        aria-label="Book Details"
        onClick={(e) => e.stopPropagation()}
        className={[
          "flex w-full max-w-md flex-col overflow-hidden rounded-[24px] glass-surface-elevated",
          "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        ].join(" ")}
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-[16px] font-semibold text-foreground">Book Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted transition-colors duration-100 active:bg-muted/60"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-muted-foreground" />
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
                  className="relative overflow-hidden rounded-[14px] bg-muted shadow-card"
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
                      <BookOpen className="h-8 w-8 text-muted-foreground" aria-hidden />
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <p className="text-center text-[17px] font-bold leading-snug text-foreground">
                {group.bookTitle}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center rounded-[16px] border border-card-border px-4 py-4">
                  <p className="text-[15px] font-bold leading-none text-foreground">
                    {naira(group.revenue)}
                  </p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">Revenue Generated</p>
                </div>
                <div className="flex flex-col items-center rounded-[16px] border border-card-border px-4 py-4">
                  <p className="text-[15px] font-bold leading-none text-foreground">
                    {group.purchaseCount}
                  </p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {group.purchaseCount === 1 ? "Purchase" : "Purchases"}
                  </p>
                </div>
              </div>

              {/* Students */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                  Students
                </p>
                <div className="overflow-hidden rounded-[16px] border border-card-border">
                  {group.buyers.map((name, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        </div>
                        <p className="text-[14px] font-medium text-foreground">{name}</p>
                      </div>
                      {i < group.buyers.length - 1 && (
                        <div className="mx-4 border-t border-border" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Copy Buyer List */}
              <button
                type="button"
                onClick={copyBuyerList}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-border py-3.5 text-[14px] font-semibold text-muted-foreground transition-all duration-150 active:scale-[0.98] active:bg-muted/50"
              >
                <Copy className="h-4 w-4" aria-hidden />
                Copy Buyer List
              </button>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Toast */}
      <div
        className={[
          "fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-foreground px-4 py-2.5 text-[13px] font-semibold text-background shadow-lg transition-all duration-300",
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
      <Sheet open={open} onClose={onClose} label="Student Purchases" variant="dialog">
        <SheetHeader title="Student Purchases" onClose={onClose} />

        {/* Search bar — sticky below header */}
        {groups.length > 0 && (
          <div className="flex-shrink-0 px-4 py-2.5 border-b border-border">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search textbooks…"
                className="w-full rounded-[10px] bg-input py-2 pl-9 pr-3 text-[13px] text-foreground placeholder-muted-foreground outline-none transition-colors duration-150 focus:shadow-glow"
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
              <BookOpen className="h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="text-[13px] text-muted-foreground">No purchases yet</p>
            </div>
          ) : filtered.length === 0 ? (
            /* Search returned nothing */
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="text-[28px]" aria-hidden>📚</span>
              <p className="text-[14px] font-semibold text-foreground">No matching textbooks found</p>
              <p className="text-[12px] text-muted-foreground">Try another search term</p>
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

// ── Modal: Payout Requests ────────────────────────────────────────────────────

function PayoutRequestsModal({
  withdrawals,
  open,
  onClose,
}: {
  withdrawals: WithdrawalRecord[];
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label="Payout Requests">
      <SheetHandle />
      <SheetHeader title="Payout Requests" onClose={onClose} />

      <div
        className="min-h-0 flex-1 overflow-y-auto pb-10"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {withdrawals.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="text-[13px] text-muted-foreground">No payout requests yet</p>
          </div>
        ) : (
          withdrawals.map((w, i) => (
            <div key={w.id}>
              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[15px] font-semibold text-foreground">{naira(w.amount)}</p>
                  <p className="text-[12px] text-muted-foreground">{formatDate(w.createdAt)}</p>
                  {w.transferReference && (
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {w.transferReference}
                    </p>
                  )}
                </div>
                <WithdrawalBadge status={w.status} />
              </div>
              {i < withdrawals.length - 1 && <div className="mx-5 border-t border-border" />}
            </div>
          ))
        )}
      </div>
    </Sheet>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

type ModalKey = "purchases" | "withdrawals" | null;

export function EarningsPageClient({ data }: { data: EarningsData }) {
  const {
    currentMonthRevenue,
    currentMonthName,
    pendingSettlement,
    availableNextPayout,
    studentPurchases,
    withdrawals,
  } = data;
  const [modal, setModal] = useState<ModalKey>(null);

  return (
    <>
      <div className="mx-auto max-w-lg px-page pb-16 pt-12">
        <header className="mb-8">
          <h1
            className="font-bold leading-none tracking-tight text-foreground"
            style={{ fontSize: "clamp(22px, 6vw, 28px)" }}
          >
            Earnings
          </h1>
        </header>

        <div className="space-y-4">
          <AvailableBalanceCard
            availableBalance={availableNextPayout}
            settling={pendingSettlement}
          />

          <MonthlyGoalSection
            currentRevenue={currentMonthRevenue}
            monthName={currentMonthName}
          />

          <SalesOverviewSection sales={studentPurchases} />

          <ActionCard
            icon={Users}
            title="Student Purchases"
            description="See everyone who purchased your textbooks"
            count={studentPurchases.length}
            onClick={() => setModal("purchases")}
          />
          <ActionCard
            icon={Wallet}
            title="Payout Requests"
            description="View queued and processed Saturday payouts"
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
      <PayoutRequestsModal
        withdrawals={withdrawals}
        open={modal === "withdrawals"}
        onClose={() => setModal(null)}
      />
    </>
  );
}
