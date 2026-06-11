import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import Link from "next/link";
import { Plus, BookOpen, BookText, BarChart3 } from "lucide-react";
import { routes } from "@/config/routes";
import { VerificationBadge } from "@/components/ui/verification-badge";
import { PublishButton } from "@/components/lecturer/publish-button";
import type { TextbookStatus } from "@prisma/client";

// ── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TextbookStatus }) {
  const styles: Record<TextbookStatus, string> = {
    DRAFT:     "bg-muted text-muted-foreground border border-border",
    PUBLISHED: "bg-success/10 text-success border border-success/30",
    ARCHIVED:  "bg-destructive/10 text-destructive border border-destructive/30",
  };
  const labels: Record<TextbookStatus, string> = {
    DRAFT:     "Draft",
    PUBLISHED: "Published",
    ARCHIVED:  "Archived",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5",
        "text-[11px] font-semibold leading-none",
        styles[status],
      ].join(" ")}
    >
      {labels[status]}
    </span>
  );
}

// ── Book card ───────────────────────────────────────────────────────────────

function BookCard({
  id,
  title,
  price,
  status,
}: {
  id: string;
  title: string;
  price: number;
  status: TextbookStatus;
}) {
  const priceLabel =
    price === 0 ? "Free" : `₦${price.toLocaleString("en-NG")}`;

  return (
    <div className="space-y-3 rounded-card border border-card-border bg-card p-card shadow-card">
      <div className="flex items-center gap-4">
        {/* Cover placeholder */}
        <div className="flex h-16 w-12 flex-shrink-0 items-center justify-center rounded-md bg-muted">
          <BookOpen className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-[15px] font-semibold text-foreground">
            {title}
          </p>
          <p className="text-[13px] text-muted-foreground">{priceLabel}</p>
          <StatusBadge status={status} />
        </div>

        {status === "DRAFT" && <PublishButton textbookId={id} />}
      </div>

      <div className="flex gap-2">
        <Link
          href={routes.textbookReader(id)}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-button bg-primary text-[13px] font-semibold text-primary-foreground transition-all duration-150 active:scale-[0.97]"
        >
          <BookText className="h-4 w-4" aria-hidden />
          Read Book
        </Link>
        <Link
          href={routes.lecturer.bookSales(id)}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-button border border-border bg-background text-[13px] font-semibold text-foreground transition-all duration-150 active:scale-[0.97]"
        >
          <BarChart3 className="h-4 w-4" aria-hidden />
          View Sales
        </Link>
      </div>
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyBooks() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-card-border bg-card px-6 py-12 text-center shadow-card">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <BookOpen className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-foreground">
          No textbooks yet
        </p>
        <p className="text-[13px] text-muted-foreground">
          Upload your first textbook to get started
        </p>
      </div>
      <Link
        href={routes.lecturer.newTextbook}
        className="inline-flex h-10 items-center rounded-button bg-primary px-5 text-[13px] font-semibold text-primary-foreground transition-all duration-150 active:scale-[0.97]"
      >
        Upload textbook
      </Link>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function LecturerBooksPage() {
  const session = await requireRole("LECTURER");

  const lecturerProfile = await db.lecturerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, verified: true },
  });

  const textbooks = lecturerProfile
    ? await db.textbook.findMany({
        where: { lecturerId: lecturerProfile.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          price: true,
          status: true,
        },
      })
    : [];

  const isVerified = lecturerProfile?.verified ?? false;

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">

      {/* ── Header ──────────────────────────────── */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-title font-bold text-foreground">My Books</h1>
          {isVerified && <VerificationBadge />}
        </div>
        <Link
          href={routes.lecturer.newTextbook}
          aria-label="Upload textbook"
          className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary transition-all duration-150 active:scale-[0.97]"
        >
          <Plus className="h-5 w-5 text-primary-foreground" aria-hidden />
        </Link>
      </header>

      {/* ── List / empty ────────────────────────── */}
      {textbooks.length === 0 ? (
        <EmptyBooks />
      ) : (
        <div className="space-y-element">
          {textbooks.map((book) => (
            <BookCard
              key={book.id}
              id={book.id}
              title={book.title}
              price={Number(book.price)}
              status={book.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
