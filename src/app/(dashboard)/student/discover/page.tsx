import { Suspense } from "react";
import { BookOpen } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { TextbookCard } from "@/components/textbooks/textbook-card";
import { DiscoverFilters } from "@/components/textbooks/discover-filters";
import {
  buildDiscoverOrderBy,
  buildDiscoverWhere,
  parseLevel,
  parseSort,
  textbookCardSelect,
} from "@/lib/textbooks/discover";

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyResults() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-card-border bg-card px-6 py-12 text-center shadow-card">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <BookOpen className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <p className="text-[15px] font-semibold text-foreground">No textbooks found</p>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

interface DiscoverSearchParams {
  q?: string;
  level?: string;
  department?: string;
  sort?: string;
}

export default async function StudentDiscoverPage({
  searchParams,
}: {
  searchParams: Promise<DiscoverSearchParams>;
}) {
  await requireRole("STUDENT");
  const params = await searchParams;

  const q = params.q?.trim() || undefined;
  const level = parseLevel(params.level ?? null);
  const departmentId = params.department?.trim() || undefined;
  const sort = parseSort(params.sort ?? null);

  // db.$transaction([...]) instead of Promise.all: pins these 2 reads to a
  // single pooled connection instead of checking out 2 concurrently.
  const [textbooks, departments] = await db.$transaction([
    db.textbook.findMany({
      where: buildDiscoverWhere({ q, level, departmentId }),
      orderBy: buildDiscoverOrderBy(sort),
      select: textbookCardSelect,
    }),
    db.department.findMany({
      where: { textbooks: { some: { status: "PUBLISHED" } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="px-page pt-12 pb-10 space-y-10 max-w-2xl mx-auto">
      <header>
        <h1 className="text-title font-bold text-foreground">D-Library</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Browse every textbook on Apexnet
        </p>
      </header>

      <Suspense fallback={null}>
        <DiscoverFilters departments={departments} />
      </Suspense>

      {textbooks.length === 0 ? (
        <EmptyResults />
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {textbooks.map((textbook) => (
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
