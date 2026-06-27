"use client";

import { useState, useEffect } from "react";
import { BookMarked, BookOpen, ShoppingBag, X } from "lucide-react";
import type { ElementType, ReactNode } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BookData = {
  title: string;
  price: number;
  salesCount: number;
  revenue: number;
};

export type SalesSummaryData = {
  totalSales: number;
  totalRevenue: number;
  bestPerformingBook: string;
  avgRevenuePerSale: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Revenue/sales figures (kobo-precision, derived from LECTURER_SHARE_RATE).
const naira = (n: number) =>
  `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// Textbook listing price — always a whole Naira amount, no Kobo.
const nairaWhole = (n: number) => `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

// ── Bottom Sheet Scaffold ─────────────────────────────────────────────────────

function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
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
        aria-label={title}
        className={[
          "fixed inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-50 flex flex-col rounded-[24px] glass-surface-elevated",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          open ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
        style={{ maxHeight: "85vh", overflow: "hidden" }}
      >
        {/* Drag handle — fixed */}
        <div className="flex flex-shrink-0 justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-foreground/20" />
        </div>
        {/* Header — fixed */}
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
        {/* Scrollable content — flex-1 fills remaining space, min-h-0 enables scroll */}
        <div className="min-h-0 flex-1 overflow-y-auto pb-10" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          {children}
        </div>
      </div>
    </>
  );
}

// ── Published Books Sheet ─────────────────────────────────────────────────────

function PublishedBooksSheet({
  books,
  open,
  onClose,
}: {
  books: BookData[];
  open: boolean;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Published Books">
      {books.length === 0 ? (
        <p className="py-16 text-center text-[14px] text-muted-foreground">No published books yet</p>
      ) : (
        <div className="px-5 py-2">
          {books.map((book, i) => (
            <div key={`${book.title}-${i}`}>
              <div className="flex items-center gap-3 py-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-muted">
                  <BookMarked className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold leading-snug text-foreground">
                    {book.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {book.price === 0 ? "Free" : nairaWhole(book.price)} ·{" "}
                    {book.salesCount} {book.salesCount === 1 ? "sale" : "sales"}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[14px] font-semibold text-foreground">
                    {naira(book.revenue)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">earned</p>
                </div>
              </div>
              {i < books.length - 1 && <div className="border-t border-border" />}
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}

// ── Sales Overview Sheet ──────────────────────────────────────────────────────

function SalesOverviewSheet({
  summary,
  open,
  onClose,
}: {
  summary: SalesSummaryData;
  open: boolean;
  onClose: () => void;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Total Sales", value: String(summary.totalSales) },
    { label: "Total Revenue Generated", value: naira(summary.totalRevenue) },
    { label: "Best Performing Book", value: summary.bestPerformingBook },
    {
      label: "Average Revenue Per Sale",
      value: summary.totalSales > 0 ? naira(summary.avgRevenuePerSale) : "—",
    },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title="Revenue Overview">
      <div className="px-5 py-4">
        <div className="overflow-hidden rounded-[18px] border border-card-border bg-card">
          {rows.map((row, i) => (
            <div key={row.label}>
              <div className="flex items-center justify-between gap-4 px-4 py-4">
                <p className="text-[13px] text-muted-foreground">{row.label}</p>
                <p className="max-w-[55%] text-right text-[14px] font-semibold leading-snug text-foreground">
                  {row.value}
                </p>
              </div>
              {i < rows.length - 1 && <div className="mx-4 border-t border-border" />}
            </div>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}

// ── Stat Card Components ──────────────────────────────────────────────────────

function InteractiveStatCard({
  icon: Icon,
  value,
  label,
  onClick,
}: {
  icon: ElementType;
  value: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-3 rounded-[18px] border border-card-border bg-card p-4 text-left shadow-card transition-all duration-150 active:scale-[0.97] hover:border-foreground/15"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      <div>
        <p className="text-[22px] font-semibold leading-none tracking-tight text-foreground">
          {value}
        </p>
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{label}</p>
      </div>
    </button>
  );
}

function StaticStatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: ElementType;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-card-border bg-card p-4 shadow-card">
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      <div>
        <p className="text-[22px] font-semibold leading-none tracking-tight text-foreground">
          {value}
        </p>
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function StatCards({
  publishedCount,
  draftCount,
  salesCount,
  books,
  salesSummary,
}: {
  publishedCount: number;
  draftCount: number;
  salesCount: number;
  books: BookData[];
  salesSummary: SalesSummaryData;
}) {
  const [booksOpen, setBooksOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);

  return (
    <>
      <div className={`grid gap-3 ${draftCount > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
        <InteractiveStatCard
          icon={BookMarked}
          value={publishedCount}
          label="Published Books"
          onClick={() => setBooksOpen(true)}
        />
        {draftCount > 0 && (
          <StaticStatCard icon={BookOpen} value={draftCount} label="Drafts" />
        )}
        <InteractiveStatCard
          icon={ShoppingBag}
          value={salesCount}
          label="Total Sales"
          onClick={() => setSalesOpen(true)}
        />
      </div>

      <PublishedBooksSheet
        books={books}
        open={booksOpen}
        onClose={() => setBooksOpen(false)}
      />
      <SalesOverviewSheet
        summary={salesSummary}
        open={salesOpen}
        onClose={() => setSalesOpen(false)}
      />

    </>
  );
}
