import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { studentProfileSchema } from "@/lib/validations/student-profile";

// Derive a short code from a free-text university name, e.g. "University of Lagos" -> "UOL".
// University.shortName is required but not user-facing here, so a best-effort initialism is fine.
function deriveShortName(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (initials || name).slice(0, 10);
}

const profileSelect = {
  name: true,
  email: true,
  avatarUrl: true,
  studentProfile: {
    select: {
      studentIdNumber: true,
      level: true,
      universityId: true,
      departmentId: true,
      university: { select: { name: true } },
      department: { select: { name: true } },
    },
  },
} satisfies Prisma.UserSelect;

type ProfileQueryResult = Prisma.UserGetPayload<{ select: typeof profileSelect }>;

function serializeProfile(user: ProfileQueryResult) {
  return {
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    studentIdNumber: user.studentProfile?.studentIdNumber ?? null,
    level: user.studentProfile?.level ?? null,
    universityId: user.studentProfile?.universityId ?? null,
    universityName: user.studentProfile?.university?.name ?? null,
    departmentId: user.studentProfile?.departmentId ?? null,
    departmentName: user.studentProfile?.department?.name ?? null,
  };
}

// ── GET /api/student/profile ────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: profileSelect,
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ profile: serializeProfile(user) });
}

// ── PATCH /api/student/profile ──────────────────────────────────────────────
// Updates name/avatar on User, and student ID number/level/university/department
// on StudentProfile. Email is read-only. University/department are resolved
// from free-text names (find-or-create), matching the lecturer profile flow.

export async function PATCH(req: NextRequest) {
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

  const parsed = studentProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const { name, avatarUrl, studentIdNumber, level, universityName, departmentName } = parsed.data;

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!studentProfile) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  // ── Resolve free-text university/department to FK ids (find-or-create) ──
  let universityId: string | null = null;
  let departmentId: string | null = null;

  const universityNameTrimmed = universityName?.trim() ?? "";
  if (universityNameTrimmed) {
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

    const departmentNameTrimmed = departmentName?.trim() ?? "";
    if (departmentNameTrimmed) {
      const department =
        (await db.department.findFirst({
          where: {
            universityId,
            name: { equals: departmentNameTrimmed, mode: "insensitive" },
          },
          select: { id: true },
        })) ??
        (await db.department.create({
          data: { universityId, name: departmentNameTrimmed },
          select: { id: true },
        }));

      departmentId = department.id;
    }
  }

  try {
    await db.$transaction([
      db.user.update({
        where: { id: session.user.id },
        data: {
          name: name || null,
          avatarUrl: avatarUrl || null,
        },
      }),
      db.studentProfile.update({
        where: { id: studentProfile.id },
        data: {
          studentIdNumber: studentIdNumber || null,
          level: level ?? null,
          universityId,
          departmentId,
        },
      }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Student ID number is already in use" }, { status: 422 });
    }
    throw error;
  }

  const updated = await db.user.findUnique({
    where: { id: session.user.id },
    select: profileSelect,
  });

  return NextResponse.json({ profile: serializeProfile(updated!) });
}
