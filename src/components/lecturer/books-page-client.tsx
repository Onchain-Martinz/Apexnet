"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, BookOpen, Plus, BarChart3, Pencil } from "lucide-react";
import { routes } from "@/config/routes";
import { coverUrl } from "@/lib/utils/cover-url";
import { TextbookCard } from "@/components/textbooks/textbook-card";
import type { TextbookCardData } from "@/components/textbooks/textbook-card";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SaleRecord = {
  studentName: string | null;
  amount: number;
  paidAt: string; // ISO
};

export type BookMetrics = {
  totalRevenue: number;
  salesCount: number;
  lastSaleAt: string | null; // ISO
  sales: SaleRecord[];
};

export type BookItem = {
  id: string;
  title: string;
  price: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  coverImageKey: string | null;
  metrics: BookMetrics;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Revenue/sales figures (kobo-precision, derived from LECTURER_SHARE_RATE).
const naira = (n: number) =>
  `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// Textbook listing price — always a whole Naira amount, no Kobo.
const nairaWhole = (n: number) => `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Status pill ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<BookItem["status"], string> = {
  PUBLISHED: "bg-success/10 text-success",
  DRAFT:     "bg-muted text-muted-foreground",
  ARCHIVED:  "bg-destructive/10 text-destructive",
};

const STATUS_LABELS: Record<BookItem["status"], string> = {
  PUBLISHED: "Published",
  DRAFT:     "Draft",
  ARCHIVED:  "Hidden",
};

function StatusPill({ status }: { status: BookItem["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ── Segmented control — Apple-style ──────────────────────────────────────────

type Tab = "my-books" | "d-library";

function SegmentedControl({
  value,
  onChange,
}: {
  value: Tab;
  onChange: (v: Tab) => void;
}) {
  return (
    <div className="flex w-full rounded-[14px] bg-muted p-1">
      {(["my-books", "d-library"] as Tab[]).map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={[
            "flex-1 rounded-[10px] py-2.5 text-[13px] font-semibold transition-all duration-200",
            value === tab
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground",
          ].join(" ")}
        >
          {tab === "my-books" ? "My Books" : "D-Library"}
        </button>
      ))}
    </div>
  );
}

// ── Metrics sheet ─────────────────────────────────────────────────────────────

function MetricsSheet({
  book,
  open,
  onClose,
}: {
  book: BookItem | null;
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

      {/* Centered dialog */}
      <div
        className={[
          "fixed inset-0 z-50 flex items-center justify-center p-4",
          open ? "" : "pointer-events-none",
        ].join(" ")}
        onClick={onClose}
      >
      <div
        role="dialog"
        aria-modal
        aria-label="Book Metrics"
        onClick={(e) => e.stopPropagation()}
        className={[
          "flex w-full max-w-md flex-col overflow-hidden rounded-[24px] glass-surface-elevated",
          "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        ].join(" ")}
        style={{ maxHeight: "85vh" }}
      >
        {/* Header — fixed */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-[16px] font-semibold text-foreground">Book Metrics</h3>
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
        <div className="min-h-0 flex-1 overflow-y-auto pb-10" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          {book && (
            <>
              {/* Book title */}
              <div className="px-5 pt-5 pb-4">
                <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
                  {book.title}
                </p>
              </div>

              {/* Quick stats — 3 columns */}
              <div className="mx-5 overflow-hidden rounded-[18px] border border-card-border">
                <div className="grid grid-cols-3 divide-x divide-card-border">
                  <div className="flex flex-col items-center px-3 py-5">
                    <p className="text-[15px] font-bold leading-none text-foreground">
                      {naira(book.metrics.totalRevenue)}
                    </p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">Revenue</p>
                  </div>
                  <div className="flex flex-col items-center px-3 py-5">
                    <p className="text-[15px] font-bold leading-none text-foreground">
                      {book.metrics.salesCount}
                    </p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">Sales</p>
                  </div>
                  <div className="flex flex-col items-center px-3 py-5">
                    <p className="text-center text-[12px] font-bold leading-tight text-foreground">
                      {book.metrics.lastSaleAt ? formatDate(book.metrics.lastSaleAt) : "—"}
                    </p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">Last Sale</p>
                  </div>
                </div>
              </div>

              {/* Sales history */}
              <div className="px-5 pt-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                  Sales History
                </p>

                {book.metrics.sales.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-[18px] border border-card-border px-6 py-10 text-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground" aria-hidden />
                    <p className="text-[13px] text-muted-foreground">No purchases yet</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[18px] border border-card-border">
                    {book.metrics.sales.map((sale, i) => (
                      <div key={`${sale.paidAt}-${i}`}>
                        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-foreground">
                              {sale.studentName ?? "Anonymous"}
                            </p>
                            <p className="mt-0.5 text-[12px] text-muted-foreground">
                              {formatDate(sale.paidAt)}
                            </p>
                          </div>
                          <p className="flex-shrink-0 text-[13px] font-semibold text-success">
                            +{naira(sale.amount)}
                          </p>
                        </div>
                        {i < book.metrics.sales.length - 1 && (
                          <div className="mx-4 border-t border-border" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </>
  );
}

// ── Inline publish action ─────────────────────────────────────────────────────

function PublishAction({ textbookId }: { textbookId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handlePublish() {
    setLoading(true);
    try {
      const res = await fetch(`/api/books/${textbookId}/publish`, { method: "PATCH" });
      if (res.ok) router.refresh();
    } catch {
      // swallow — user can retry
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handlePublish}
      disabled={loading}
      className="flex h-8 flex-1 items-center justify-center rounded-[8px] bg-primary text-[11px] font-semibold text-primary-foreground transition-all duration-150 active:scale-[0.97] disabled:opacity-50"
    >
      {loading ? "…" : "Publish"}
    </button>
  );
}

// ── Book card — Apple Books grid style ────────────────────────────────────────

function BookCard({
  book,
  onViewMetrics,
}: {
  book: BookItem;
  onViewMetrics: () => void;
}) {
  const { id, title, price, status, coverImageKey } = book;
  const priceLabel = price === 0 ? "Free" : nairaWhole(price);

  return (
    <div className="flex flex-col overflow-hidden rounded-[18px] border border-card-border bg-card shadow-card">

      {/* ── Cover — fills card width, 3:4 ratio ── */}
      <div className="relative w-full bg-muted" style={{ aspectRatio: "3 / 4" }}>
        {coverUrl(id, coverImageKey) ? (
          <Image
            src={coverUrl(id, coverImageKey)!}
            alt={title}
            fill
            sizes="(max-width: 640px) 45vw, 200px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" aria-hidden />
          </div>
        )}

        {/* Draft / Archived overlay badge */}
        {status !== "PUBLISHED" && (
          <div className="absolute left-2 top-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none backdrop-blur-sm ${STATUS_STYLES[status]}`}>
              {STATUS_LABELS[status]}
            </span>
          </div>
        )}
      </div>

      {/* ── Info ── */}
      <div className="flex flex-1 flex-col gap-2 px-3 pt-3 pb-1">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">
          {title}
        </p>
        <div className="flex items-center justify-between gap-1">
          <p className="text-[12px] font-medium text-muted-foreground">{priceLabel}</p>
          {status === "PUBLISHED" && <StatusPill status={status} />}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-1.5 px-3 pb-3 pt-2">
        {/* Read Book — always present */}
        <Link
          href={routes.textbookReader(id)}
          className="flex h-8 flex-1 items-center justify-center rounded-[8px] bg-primary text-[11px] font-semibold text-primary-foreground transition-all duration-150 active:scale-[0.97]"
        >
          Read
        </Link>

        {/* Edit — lecturer may edit their own textbook regardless of status */}
        <Link
          href={routes.lecturer.editTextbook(id)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] border border-border bg-card text-muted-foreground transition-all duration-150 active:scale-[0.97]"
          aria-label="Edit Textbook"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </Link>

        {/* Draft: Publish button / Published+Archived: Metrics icon */}
        {status === "DRAFT" ? (
          <PublishAction textbookId={id} />
        ) : (
          <button
            type="button"
            onClick={onViewMetrics}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] border border-border bg-card text-muted-foreground transition-all duration-150 active:scale-[0.97]"
            aria-label="View Metrics"
          >
            <BarChart3 className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Empty states ──────────────────────────────────────────────────────────────

function EmptyBooks() {
  return (
    <div className="flex flex-col items-center gap-5 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-muted">
        <BookOpen className="h-8 w-8 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1.5">
        <p className="text-[17px] font-semibold text-foreground">No books yet</p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Upload your first textbook and start earning
        </p>
      </div>
      <Link
        href={routes.lecturer.newTextbook}
        className="inline-flex h-11 items-center rounded-[12px] bg-primary px-6 text-[14px] font-semibold text-primary-foreground transition-all duration-150 active:scale-[0.97]"
      >
        Upload a Textbook
      </Link>
    </div>
  );
}

function EmptyDLibrary() {
  return (
    <div className="flex flex-col items-center gap-5 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-muted">
        <BookOpen className="h-8 w-8 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1.5">
        <p className="text-[17px] font-semibold text-foreground">No books in the library</p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Published textbooks from all lecturers will appear here
        </p>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function BooksPageClient({
  books,
  dLibraryBooks,
}: {
  books: BookItem[];
  dLibraryBooks: TextbookCardData[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("my-books");
  const [activeBook, setActiveBook] = useState<BookItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function openMetrics(book: BookItem) {
    setActiveBook(book);
    setSheetOpen(true);
  }

  return (
    <>
      <div className="mx-auto max-w-lg px-page pb-16 pt-12">

        {/* ── Header ───────────────────────────────────────────── */}
        <header className="mb-6 flex items-center justify-between">
          <h1
            className="font-bold leading-none tracking-tight text-foreground"
            style={{ fontSize: "clamp(22px, 6vw, 28px)" }}
          >
            Books
          </h1>
          {activeTab === "my-books" && (
            <Link
              href={routes.lecturer.newTextbook}
              className="flex h-9 items-center gap-1.5 rounded-[10px] bg-primary px-3 text-[13px] font-semibold text-primary-foreground transition-all duration-150 active:scale-[0.97]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New Book
            </Link>
          )}
        </header>

        {/* ── Segmented control ─────────────────────────────────── */}
        <div className="mb-6">
          <SegmentedControl value={activeTab} onChange={setActiveTab} />
        </div>

        {/* ── My Books ─────────────────────────────────────────── */}
        {activeTab === "my-books" && (
          books.length === 0 ? (
            <EmptyBooks />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onViewMetrics={() => openMetrics(book)}
                />
              ))}
            </div>
          )
        )}

        {/* ── D-Library ─────────────────────────────────────────── */}
        {activeTab === "d-library" && (
          <div>
            <p className="mb-4 text-[13px] text-muted-foreground">
              Browse all published textbooks from lecturers across Apex
            </p>
            {dLibraryBooks.length === 0 ? (
              <EmptyDLibrary />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {dLibraryBooks.map((textbook) => (
                  <TextbookCard key={textbook.id} textbook={textbook} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Metrics sheet ─────────────────────────────────────── */}
      <MetricsSheet
        book={activeBook}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
