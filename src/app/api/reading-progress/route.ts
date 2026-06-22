import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const bodySchema = z.object({
  textbookId: z.string().uuid(),
  currentPage: z.number().int().min(1),
  totalPages: z.number().int().min(1),
});

// ── POST /api/reading-progress ──────────────────────────────────────────────
// Upserts the student's reading position for a textbook, keyed on
// (studentId, textbookId). Called by the reader on debounced page changes.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const { textbookId, currentPage, totalPages } = parsed.data;
  const currentPageClamped = Math.min(currentPage, totalPages);
  const percentage = (currentPageClamped / totalPages) * 100;

  const progress = await db.readingProgress.upsert({
    where: {
      studentId_textbookId: {
        studentId: session.user.id,
        textbookId,
      },
    },
    update: {
      currentPage: currentPageClamped,
      totalPages,
      percentage,
      lastReadAt: new Date(),
    },
    create: {
      studentId: session.user.id,
      textbookId,
      currentPage: currentPageClamped,
      totalPages,
      percentage,
      lastReadAt: new Date(),
    },
    select: {
      currentPage: true,
      totalPages: true,
      percentage: true,
      lastReadAt: true,
    },
  });

  return NextResponse.json({ progress });
}
