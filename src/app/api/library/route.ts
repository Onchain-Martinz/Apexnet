import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { textbookCardSelect } from "@/lib/textbooks/discover";

// ── GET /api/library ─────────────────────────────────────────────────────────
// Returns the authenticated student's owned textbooks (purchased or free).

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await db.studentLibrary.findMany({
    where: { studentId: session.user.id, textbook: { status: "PUBLISHED" } },
    orderBy: { addedAt: "desc" },
    select: {
      addedAt: true,
      textbook: { select: textbookCardSelect },
    },
  });

  return NextResponse.json({ library: entries });
}
