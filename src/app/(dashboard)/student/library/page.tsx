import { BookOpen } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { TextbookCard } from "@/components/textbooks/textbook-card";
import { textbookCardSelect } from "@/lib/textbooks/discover";

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
    where: { studentId: session.user.id },
    orderBy: { addedAt: "desc" },
    select: {
      textbook: { select: textbookCardSelect },
    },
  });

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header>
        <h1 className="text-title font-bold text-foreground">Library</h1>
      </header>

      {entries.length === 0 ? (
        <EmptyLibrary />
      ) : (
        <div className="grid grid-cols-2 gap-element">
          {entries.map(({ textbook }) => (
            <TextbookCard
              key={textbook.id}
              textbook={{ ...textbook, price: Number(textbook.price) }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
