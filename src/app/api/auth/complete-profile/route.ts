import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { completeProfileSchema } from "@/lib/validations/auth";
import { findOrCreateUniversity, findOrCreateDepartment } from "@/lib/db/university";
import { captureException } from "@/lib/monitoring";
import type { Role } from "@prisma/client";

// ── POST /api/auth/complete-profile ─────────────────────────────────────────
// Finishes onboarding for a brand-new Google user: sets their role + name and,
// for students, their school/level. Rejects users who are already complete so
// it can't be replayed to mutate a finished account. No OTP is involved —
// Google users arrive email-verified.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, profileComplete: true, hashedPassword: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Server-side enforcement of the same rule the middleware uses. This route
  // must never be able to rewrite a privileged or established account's role.
  // ADMINs are never eligible; any account with a password (credentials/legacy)
  // is excluded — only passwordless OAuth onboarding accounts may proceed.
  if (user.role === "ADMIN") {
    return NextResponse.json(
      { error: "Admins cannot use profile onboarding." },
      { status: 403 },
    );
  }

  if (user.hashedPassword !== null) {
    return NextResponse.json(
      { error: "This account is not eligible for profile onboarding." },
      { status: 403 },
    );
  }

  if (user.profileComplete) {
    return NextResponse.json({ error: "Profile is already complete." }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = completeProfileSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return NextResponse.json({ error: firstError.message }, { status: 422 });
  }

  const { name, role, universityName, departmentName, level } = parsed.data;
  const trimmedName = name.trim();

  try {
    if (role === "STUDENT") {
      // Resolve free-text school to FK ids outside the transaction (matches the
      // register route) so the interactive transaction stays short.
      const universityId = await findOrCreateUniversity(universityName!);
      const departmentId = await findOrCreateDepartment(universityId, departmentName!);

      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { name: trimmedName, role: "STUDENT" as Role, profileComplete: true },
        });
        // Google users have a placeholder studentProfile; update it, or create
        // one if somehow missing.
        await tx.studentProfile.upsert({
          where: { userId },
          update: { universityId, departmentId, level },
          create: { userId, universityId, departmentId, level },
        });
      });
    } else {
      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { name: trimmedName, role: "LECTURER" as Role, profileComplete: true },
        });
        await tx.lecturerProfile.upsert({
          where: { userId },
          update: {},
          create: { userId },
        });
        // Drop the placeholder student profile so a lecturer never ends up
        // with both profiles. No-op if it was never created.
        await tx.studentProfile.deleteMany({ where: { userId } });
      });
    }

    return NextResponse.json({ success: true, role }, { status: 200 });
  } catch (err) {
    console.error("[COMPLETE_PROFILE]", err);
    captureException(err, { userId });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
