import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

// Accepts either the base client or an interactive-transaction client so
// callers can resolve schools inside or outside a `$transaction`.
type DbClient = PrismaClient | Prisma.TransactionClient;

// Derive a short code from a free-text university name, e.g. "University of
// Lagos" -> "UOL". Shared by /api/auth/register and /api/auth/complete-profile
// so both onboarding lanes create identical University rows.
export function deriveShortName(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (initials || name).slice(0, 10);
}

// Find-or-create a university by free-text name (case-insensitive match).
export async function findOrCreateUniversity(
  name: string,
  client: DbClient = db,
): Promise<string> {
  const trimmed = name.trim();
  const existing = await client.university.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await client.university.create({
    data: { name: trimmed, shortName: deriveShortName(trimmed) },
    select: { id: true },
  });
  return created.id;
}

// Find-or-create a department within a university by free-text name.
export async function findOrCreateDepartment(
  universityId: string,
  name: string,
  client: DbClient = db,
): Promise<string> {
  const trimmed = name.trim();
  const existing = await client.department.findFirst({
    where: { universityId, name: { equals: trimmed, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await client.department.create({
    data: { universityId, name: trimmed },
    select: { id: true },
  });
  return created.id;
}
