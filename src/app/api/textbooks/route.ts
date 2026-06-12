import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  buildDiscoverOrderBy,
  buildDiscoverWhere,
  parseLevel,
  parseSort,
  textbookCardSelect,
} from "@/lib/textbooks/discover";

// ── GET /api/textbooks ──────────────────────────────────────────────────────
// Browse the published catalogue.
// Query params: ?q= ?level= ?department= ?sort=(newest|price_asc|price_desc)

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || undefined;
  const level = parseLevel(searchParams.get("level"));
  const departmentId = searchParams.get("department")?.trim() || undefined;
  const sort = parseSort(searchParams.get("sort"));

  const textbooks = await db.textbook.findMany({
    where: buildDiscoverWhere({ q, level, departmentId }),
    orderBy: buildDiscoverOrderBy(sort),
    select: textbookCardSelect,
  });

  return NextResponse.json({ textbooks });
}
