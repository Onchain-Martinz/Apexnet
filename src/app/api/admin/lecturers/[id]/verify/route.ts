import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// ── PATCH /api/admin/lecturers/[id]/verify ──────────────────────────────────
// [id] is LecturerProfile.id. Toggles verified status + verifiedAt timestamp.

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

  const verified = (body as { verified?: unknown }).verified;
  if (typeof verified !== "boolean") {
    return NextResponse.json({ error: "verified must be a boolean" }, { status: 422 });
  }

  const lecturer = await db.lecturerProfile.findUnique({ where: { id }, select: { id: true } });
  if (!lecturer) {
    return NextResponse.json({ error: "Lecturer not found" }, { status: 404 });
  }

  const updated = await db.lecturerProfile.update({
    where: { id },
    data: { verified, verifiedAt: verified ? new Date() : null },
    select: { id: true, verified: true, verifiedAt: true },
  });

  return NextResponse.json({ success: true, lecturer: updated });
}
