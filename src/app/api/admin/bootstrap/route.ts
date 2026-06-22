import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { bootstrapAdminSchema } from "@/lib/validations/admin";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

// ── GET /api/admin/bootstrap ─────────────────────────────────────────────────
// Reports whether the bootstrap route is still open (no ADMIN account exists yet).

export async function GET() {
  const existingAdmin = await db.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  return NextResponse.json({ available: !existingAdmin });
}

// ── POST /api/admin/bootstrap ────────────────────────────────────────────────
// Creates the first ADMIN account. Self-disables once any ADMIN account exists.

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`bootstrap:${getClientIp(req)}`, RATE_LIMITS.ADMIN_BOOTSTRAP);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  // Bootstrap is for a signed-out founder only — once anyone holds a session
  // (student, lecturer, or admin), this route is off-limits.
  const session = await auth();
  if (session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existingAdmin = await db.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (existingAdmin) {
    return NextResponse.json(
      { error: "An admin account already exists. The bootstrap route is disabled." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = bootstrapAdminSchema.safeParse(body);
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

  const admin = await db.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      hashedPassword,
      role: "ADMIN",
      isActive: true,
      // Admin bootstrap accounts skip the OTP flow — verified at creation.
      emailVerifiedAt: new Date(),
    },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ success: true, admin }, { status: 201 });
}
