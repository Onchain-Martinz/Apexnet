import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// ── PATCH /api/admin/textbooks/[id]/status ──────────────────────────────────
// Hide (ARCHIVED) or unhide (PUBLISHED) a textbook from the catalogue.
// DRAFT textbooks cannot be toggled here — only published/archived.

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const status = (body as { status?: unknown }).status;
  if (status !== "PUBLISHED" && status !== "ARCHIVED") {
    return NextResponse.json({ error: "status must be PUBLISHED or ARCHIVED" }, { status: 422 });
  }

  const textbook = await db.textbook.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!textbook) {
    return NextResponse.json({ error: "Textbook not found" }, { status: 404 });
  }
  if (textbook.status === "DRAFT") {
    return NextResponse.json({ error: "Draft textbooks cannot be hidden or unhidden" }, { status: 422 });
  }

  const updated = await db.textbook.update({
    where: { id },
    data: { status },
    select: { id: true, status: true },
  });

  return NextResponse.json({ success: true, textbook: updated });
}
