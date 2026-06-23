import Link from "next/link";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { routes } from "@/config/routes";
import { coverUrl } from "@/lib/utils/cover-url";
import { TextbookActions } from "@/components/admin/textbook-actions";
import type { TextbookStatus } from "@prisma/client";

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TextbookStatus }) {
  const styles: Record<TextbookStatus, string> = {
    DRAFT:     "bg-muted text-muted-foreground border border-border",
    PUBLISHED: "bg-success/10 text-success border border-success/30",
    ARCHIVED:  "bg-destructive/10 text-destructive border border-destructive/30",
  };
  const labels: Record<TextbookStatus, string> = {
    DRAFT:     "Draft",
    PUBLISHED: "Published",
    ARCHIVED:  "Hidden",
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

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyTextbooks() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-card-border bg-card px-6 py-10 text-center shadow-card">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <BookOpen className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-foreground">No textbooks yet</p>
        <p className="text-[13px] text-muted-foreground">
          Textbooks uploaded by lecturers will appear here
        </p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminTextbooksPage() {
  await requireRole("ADMIN");

  const textbooks = await db.textbook.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      price: true,
      status: true,
      coverImageKey: true,
      lecturer: { select: { user: { select: { name: true } } } },
      _count: { select: { purchases: { where: { status: "COMPLETED" } } } },
    },
  });

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header>
        <p className="text-[13px] font-medium text-muted-foreground">Apex · Admin</p>
        <h1 className="mt-0.5 text-title font-bold text-foreground">Textbooks</h1>
      </header>

      {textbooks.length === 0 ? (
        <EmptyTextbooks />
      ) : (
        <div className="space-y-element">
          {textbooks.map((textbook) => (
            <div
              key={textbook.id}
              className="space-y-3 rounded-card border border-card-border bg-card p-card shadow-card"
            >
              <div className="flex items-start gap-3">
                {/* Cover thumbnail */}
                <div className="flex h-16 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {coverUrl(textbook.id, textbook.coverImageKey) ? (
                    <Image
                      src={coverUrl(textbook.id, textbook.coverImageKey)!}
                      alt={textbook.title}
                      width={48}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <BookOpen className="h-5 w-5 text-muted-foreground" aria-hidden />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-[15px] font-semibold text-foreground">{textbook.title}</p>
                  <p className="truncate text-[13px] text-muted-foreground">
                    {textbook.lecturer.user.name ?? "Unknown lecturer"}
                  </p>
                </div>
                <StatusBadge status={textbook.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-[16px] font-bold text-foreground">
                    {textbook.price === 0 ? "Free" : naira(textbook.price)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Price</p>
                </div>
                <div>
                  <p className="text-[16px] font-bold text-foreground">{textbook._count.purchases}</p>
                  <p className="text-[11px] text-muted-foreground">Sales</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={routes.textbook(textbook.id)}
                  className="flex h-10 items-center justify-center rounded-button border border-border bg-background px-4 text-[13px] font-semibold text-foreground transition-all duration-150 active:scale-[0.97]"
                >
                  View Details
                </Link>
                <TextbookActions textbookId={textbook.id} status={textbook.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
