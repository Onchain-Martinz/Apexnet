"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Upload,
  CheckCircle2,
  ShoppingBag,
  Wallet,
  XCircle,
  BookOpen,
  X,
  ChevronRight,
} from "lucide-react";
import { routes } from "@/config/routes";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActivityItemData = {
  type:
    | "uploaded"
    | "published"
    | "purchased"
    | "withdrawal_submitted"
    | "withdrawal_approved"
    | "withdrawal_rejected";
  label: string;
  detail: string;
  date: string; // ISO 8601 — serialization-safe across server→client boundary
  pill?: {
    text: string;
    variant: "neutral" | "success" | "destructive" | "amount" | "primary";
  };
};

type DateGroup = { label: string; items: ActivityItemData[] };

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 2) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

function groupByDate(items: ActivityItemData[]): DateGroup[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;

  const buckets = new Map<string, ActivityItemData[]>();

  for (const item of items) {
    const d = new Date(item.date);
    const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    let label: string;
    if (dStart === todayStart) label = "Today";
    else if (dStart === yesterdayStart) label = "Yesterday";
    else label = d.toLocaleDateString("en-NG", { month: "long", day: "numeric" });

    const bucket = buckets.get(label) ?? [];
    bucket.push(item);
    buckets.set(label, bucket);
  }

  return Array.from(buckets.entries()).map(([label, items]) => ({ label, items }));
}

// ── Pill ───────────────────────────────────────────────────────────────────────

const PILL_STYLES: Record<string, string> = {
  neutral:     "bg-muted text-muted-foreground",
  success:     "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
  amount:      "bg-success/10 text-success",
  primary:     "bg-primary/10 text-primary",
};

function Pill({ text, variant }: { text: string; variant: string }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-none flex-shrink-0",
        PILL_STYLES[variant] ?? PILL_STYLES.neutral,
      ].join(" ")}
    >
      {text}
    </span>
  );
}

// ── Activity Row ──────────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  uploaded:             Upload,
  published:            CheckCircle2,
  purchased:            ShoppingBag,
  withdrawal_submitted: Wallet,
  withdrawal_approved:  CheckCircle2,
  withdrawal_rejected:  XCircle,
};

function ActivityRow({ item }: { item: ActivityItemData }) {
  const Icon = ACTIVITY_ICONS[item.type] ?? BookOpen;
  return (
    <div className="flex items-center gap-3 py-3.5">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-snug text-foreground">
          {item.label}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{item.detail}</p>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        {item.pill && <Pill text={item.pill.text} variant={item.pill.variant} />}
        <p className="text-[11px] text-muted-foreground">{relativeTime(item.date)}</p>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyActivity() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[18px] border border-card-border bg-card px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <BookOpen className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-foreground">No activity yet</p>
        <p className="text-[13px] text-muted-foreground">
          Publish your first textbook to start earning
        </p>
      </div>
      <Link
        href={routes.lecturer.newTextbook}
        className="inline-flex h-10 items-center rounded-[10px] bg-primary px-5 text-[13px] font-semibold text-primary-foreground transition-all duration-150 active:scale-[0.97]"
      >
        Upload textbook
      </Link>
    </div>
  );
}

// ── Bottom Sheet ──────────────────────────────────────────────────────────────

function ActivityBottomSheet({
  activity,
  open,
  onClose,
}: {
  activity: ActivityItemData[];
  open: boolean;
  onClose: () => void;
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

  const groups = groupByDate(activity);

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          "fixed inset-0 z-40 bg-black/25 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal
        aria-label="Activity History"
        className={[
          "fixed inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-50 flex flex-col rounded-[24px] glass-surface-elevated",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          open ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
        style={{ maxHeight: "82vh" }}
      >
        {/* Drag handle — fixed */}
        <div className="flex flex-shrink-0 justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-foreground/20" />
        </div>

        {/* Header — fixed */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-[16px] font-semibold text-foreground">Activity History</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted transition-colors duration-100 active:bg-muted/60"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable content — flex-1 fills remaining space, min-h-0 enables scroll */}
        <div className="min-h-0 flex-1 overflow-y-auto pb-10">
          {groups.length === 0 ? (
            <p className="py-16 text-center text-[14px] text-muted-foreground">No activity yet</p>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <p className="px-5 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map((item, i) => (
                  <div key={`${item.type}-${i}`}>
                    <div className="px-5">
                      <ActivityRow item={item} />
                    </div>
                    {i < group.items.length - 1 && (
                      <div className="mx-5 border-t border-border" />
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ── Activity Section ──────────────────────────────────────────────────────────

const FEED_LIMIT = 3;

export function ActivitySection({ activity }: { activity: ActivityItemData[] }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (activity.length === 0) {
    return <EmptyActivity />;
  }

  const feedItems = activity.slice(0, FEED_LIMIT);

  return (
    <>
      <div className="overflow-hidden rounded-[18px] border border-card-border bg-card shadow-card">
        {feedItems.map((item, index) => (
          <div key={`${item.type}-${item.detail}-${index}`}>
            <div className="px-4">
              <ActivityRow item={item} />
            </div>
            {index < feedItems.length - 1 && (
              <div className="mx-4 border-t border-border" />
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="mt-3 flex items-center gap-1 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        View all activity
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </button>

      <ActivityBottomSheet
        activity={activity}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
