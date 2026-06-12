import type { Prisma } from "@prisma/client";

// ── Shared query building blocks for browsing the published catalogue ───────
// Used by /api/textbooks and the /student/discover page so both stay in sync.

export const ACADEMIC_LEVELS = [100, 200, 300, 400, 500] as const;

export type DiscoverSort = "newest" | "price_asc" | "price_desc";

export interface DiscoverFilters {
  q?: string;
  level?: number;
  departmentId?: string;
  sort?: DiscoverSort;
}

// Fields actually rendered on discover / home / detail cards.
export const textbookCardSelect = {
  id: true,
  title: true,
  price: true,
  isFree: true,
  coverImageKey: true,
  level: true,
  courseCode: true,
  createdAt: true,
  lecturer: { select: { user: { select: { name: true } } } },
  department: { select: { name: true } },
} satisfies Prisma.TextbookSelect;

export function buildDiscoverWhere(filters: DiscoverFilters): Prisma.TextbookWhereInput {
  const where: Prisma.TextbookWhereInput = { status: "PUBLISHED" };

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { courseCode: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.level) {
    where.level = filters.level;
  }

  if (filters.departmentId) {
    where.departmentId = filters.departmentId;
  }

  return where;
}

export function buildDiscoverOrderBy(sort?: DiscoverSort): Prisma.TextbookOrderByWithRelationInput {
  switch (sort) {
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export function parseLevel(value: string | null): number | undefined {
  if (!value) return undefined;
  const level = parseInt(value, 10);
  return (ACADEMIC_LEVELS as readonly number[]).includes(level) ? level : undefined;
}

export function parseSort(value: string | null): DiscoverSort | undefined {
  if (value === "price_asc" || value === "price_desc" || value === "newest") return value;
  return undefined;
}
