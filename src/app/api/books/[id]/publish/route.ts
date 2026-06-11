import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// ── PATCH /api/books/[id]/publish ───────────────────────────────────────────
// Publishes a DRAFT textbook owned by the authenticated lecturer.

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "LECTURER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const lecturerProfile = await db.lecturerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!lecturerProfile) {
    return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
  }

  const textbook = await db.textbook.findUnique({
    where: { id },
    select: { id: true, lecturerId: true, status: true },
  });

  if (!textbook || textbook.lecturerId !== lecturerProfile.id) {
    return NextResponse.json({ error: "Textbook not found" }, { status: 404 });
  }

  if (textbook.status !== "DRAFT") {
    return NextResponse.json({ error: "Only draft textbooks can be published" }, { status: 422 });
  }

  const updated = await db.textbook.update({
    where: { id: textbook.id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
    select: { id: true, status: true, publishedAt: true },
  });

  return NextResponse.json({ success: true, textbook: updated });
}
