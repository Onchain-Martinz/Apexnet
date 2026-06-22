import { BookOpen } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { LibraryBookCard } from "@/components/textbooks/library-book-card";

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-card-border bg-card px-6 py-12 text-center shadow-card">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <BookOpen className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-foreground">Your library is empty</p>
        <p className="text-[13px] text-muted-foreground">
          Textbooks you buy or read for free will appear here
        </p>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function StudentLibraryPage() {
  const session = await requireRole("STUDENT");

  const entries = await db.studentLibrary.findMany({
    where: { studentId: session.user.id, textbook: { status: "PUBLISHED" } },
    orderBy: { addedAt: "desc" },
    take: 100,
    select: {
      textbook: { select: { id: true, title: true, coverImageKey: true } },
    },
  });

  const progressRows = entries.length
    ? await db.readingProgress.findMany({
        where: {
          studentId: session.user.id,
          textbookId: { in: entries.map(({ textbook }) => textbook.id) },
        },
        select: { textbookId: true, currentPage: true, totalPages: true, percentage: true, lastReadAt: true },
      })
    : [];

  const progressByTextbookId = new Map(progressRows.map((row) => [row.textbookId, row]));

  return (
    <div className="px-page pt-12 pb-10 space-y-10 max-w-2xl mx-auto">
      <header>
        <h1 className="text-title font-bold text-foreground">Library</h1>
      </header>

      {entries.length === 0 ? (
        <EmptyLibrary />
      ) : (
        <div className="space-y-4">
          {entries.map(({ textbook }) => (
            <LibraryBookCard
              key={textbook.id}
              textbook={textbook}
              progress={progressByTextbookId.get(textbook.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
