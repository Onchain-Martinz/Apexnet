import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { routes } from "@/config/routes";

// ── Book card ───────────────────────────────────────────────────────────────

function BookCard({
  id,
  title,
  description,
  price,
}: {
  id: string;
  title: string;
  description: string | null;
  price: number;
}) {
  const priceLabel = price === 0 ? "Free" : `₦${price.toLocaleString("en-NG")}`;

  return (
    <Link
      href={routes.textbook(id)}
      className="flex items-center gap-4 rounded-card border border-card-border bg-card p-card shadow-card"
    >
      {/* Cover placeholder */}
      <div className="flex h-16 w-12 flex-shrink-0 items-center justify-center rounded-md bg-muted">
        <BookOpen className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-[15px] font-semibold text-foreground">
          {title}
        </p>
        {description && (
          <p className="truncate text-[13px] text-muted-foreground">{description}</p>
        )}
        <p className="text-[13px] text-muted-foreground">{priceLabel}</p>
      </div>
    </Link>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-card-border bg-card px-6 py-12 text-center shadow-card">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <BookOpen className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-foreground">
          No textbooks available yet
        </p>
        <p className="text-[13px] text-muted-foreground">
          Published textbooks will appear here
        </p>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function StudentLibraryPage() {
  await requireRole("STUDENT");

  const textbooks = await db.textbook.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
    },
  });


  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header>
        <h1 className="text-title font-bold text-foreground">Library</h1>
      </header>

      {textbooks.length === 0 ? (
        <EmptyLibrary />
      ) : (
        <div className="space-y-element">
          {textbooks.map((book) => (
            <BookCard
              key={book.id}
              id={book.id}
              title={book.title}
              description={book.description}
              price={Number(book.price)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
