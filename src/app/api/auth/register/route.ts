import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations/auth";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { issueEmailVerificationOtp } from "@/lib/auth/email-verification";
import type { Role } from "@prisma/client";
import { captureException } from "@/lib/monitoring";

// Derive a short code from a free-text university name, e.g. "University of
// Lagos" -> "UOL". Mirrors the same helper in /api/lecturer/profile.
function deriveShortName(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (initials || name).slice(0, 10);
}

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

    const { name, email, password, role, universityName, departmentName, level } = parsed.data;
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

    // Resolve free-text university/department to FK ids (find-or-create) —
    // only relevant for STUDENT role; registerSchema already guarantees
    // these are non-empty when role === "STUDENT".
    let universityId: string | null = null;
    let departmentId: string | null = null;

    if (role === "STUDENT") {
      const universityNameTrimmed = universityName!.trim();
      const university =
        (await db.university.findFirst({
          where: { name: { equals: universityNameTrimmed, mode: "insensitive" } },
          select: { id: true },
        })) ??
        (await db.university.create({
          data: { name: universityNameTrimmed, shortName: deriveShortName(universityNameTrimmed) },
          select: { id: true },
        }));
      universityId = university.id;

      const departmentNameTrimmed = departmentName!.trim();
      const department =
        (await db.department.findFirst({
          where: { universityId, name: { equals: departmentNameTrimmed, mode: "insensitive" } },
          select: { id: true },
        })) ??
        (await db.department.create({
          data: { universityId, name: departmentNameTrimmed },
          select: { id: true },
        }));
      departmentId = department.id;
    }

    const user = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          hashedPassword,
          role: role as Role,
        },
      });

      if (role === "STUDENT") {
        await tx.studentProfile.create({
          data: { userId: user.id, universityId, departmentId, level },
        });
      } else if (role === "LECTURER") {
        await tx.lecturerProfile.create({ data: { userId: user.id } });
      }

      return user;
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
