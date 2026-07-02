import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations/auth";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { issueEmailVerificationOtp } from "@/lib/auth/email-verification";
import { captureException } from "@/lib/monitoring";

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`register:${getClientIp(req)}`, RATE_LIMITS.AUTH);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 422 }
      );
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Role and academic/profile fields are collected on /complete-profile
    // after auth — this route only ever creates a bare account (role
    // defaults to STUDENT per schema; complete-profile corrects it).
    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        hashedPassword,
        profileComplete: false,
      },
    });

    await issueEmailVerificationOtp(user);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[REGISTER]", err);
    captureException(err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
