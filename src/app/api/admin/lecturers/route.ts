import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createLecturerSchema } from "@/lib/validations/admin";

// ── POST /api/admin/lecturers ───────────────────────────────────────────────
// Founder-operated lecturer onboarding — creates a lecturer account directly
// with a system-generated temporary password, replacing the public signup
// flow for this purpose. The lecturer is forced to set their own password on
// first login (mustChangePassword) via a blocking in-dashboard modal — login
// and dashboard access are never blocked by this. emailVerifiedAt is left
// unset: real email verification is required, but only prompted *after* the
// password has been changed (see middleware's deferred verify-email gate).

// Avoids visually ambiguous characters (0/O, 1/I/l) since this is read off
// a screen and relayed to the lecturer by hand during pilot onboarding.
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";

function generateTempPassword(): string {
  const all = UPPER + LOWER + DIGITS;
  const pick = (chars: string) => chars[randomInt(chars.length)];

  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), ...Array.from({ length: 7 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

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

  const { name, email } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const temporaryPassword = generateTempPassword();
  const hashedPassword = await bcrypt.hash(temporaryPassword, 12);
  const now = new Date();

  const lecturer = await db.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      hashedPassword,
      role: "LECTURER",
      mustChangePassword: true,
      lecturerProfile: {
        create: {
          verified: true,
          verifiedAt: now,
        },
      },
    },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ success: true, lecturer, temporaryPassword }, { status: 201 });
}
