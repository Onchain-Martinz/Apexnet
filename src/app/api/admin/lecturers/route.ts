import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createLecturerSchema } from "@/lib/validations/admin";

// ── POST /api/admin/lecturers ───────────────────────────────────────────────
// Founder-operated lecturer onboarding — creates a verified lecturer account
// directly, replacing the public signup flow for this purpose.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createLecturerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const now = new Date();

  const lecturer = await db.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      hashedPassword,
      role: "LECTURER",
      lecturerProfile: {
        create: {
          verified: true,
          verifiedAt: now,
        },
      },
    },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ success: true, lecturer }, { status: 201 });
}
