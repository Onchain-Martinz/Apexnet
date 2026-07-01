import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { captureException } from "@/lib/monitoring";

const schema = z
  .object({
    role: z.enum(["STUDENT", "LECTURER"]),
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
    universityName: z.string().trim().min(1, "University is required"),
    departmentName: z.string().trim().min(1, "Department is required"),
    level: z.number().int().refine((n) => [100, 200, 300, 400, 500].includes(n)).optional(),
    matricNumber: z.string().trim().max(50).optional(),
  })
  .refine((d) => d.role !== "STUDENT" || d.level !== undefined, {
    message: "Level is required for students",
    path: ["level"],
  });

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
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Guard: already complete — idempotent but skip heavy work.
    const existing = await db.user.findUnique({
      where: { id: userId },
      select: { profileComplete: true, isActive: true },
    });
    if (!existing || !existing.isActive) {
      return NextResponse.json({ error: "Account not found or inactive" }, { status: 403 });
    }
    if (existing.profileComplete) {
      return NextResponse.json({ error: "Profile already completed" }, { status: 409 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      return NextResponse.json({ error: first.message }, { status: 422 });
    }

    const { role, name, universityName, departmentName, level, matricNumber } = parsed.data;

    // Find-or-create university
    const uniTrimmed = universityName.trim();
    const university =
      (await db.university.findFirst({
        where: { name: { equals: uniTrimmed, mode: "insensitive" } },
        select: { id: true },
      })) ??
      (await db.university.create({
        data: { name: uniTrimmed, shortName: deriveShortName(uniTrimmed) },
        select: { id: true },
      }));

    // Find-or-create department within that university
    const deptTrimmed = departmentName.trim();
    const department =
      (await db.department.findFirst({
        where: {
          universityId: university.id,
          name: { equals: deptTrimmed, mode: "insensitive" },
        },
        select: { id: true },
      })) ??
      (await db.department.create({
        data: { universityId: university.id, name: deptTrimmed },
        select: { id: true },
      }));

    await db.$transaction(async (tx) => {
      // Update user name, role, and mark profile complete.
      await tx.user.update({
        where: { id: userId },
        data: { name, role, profileComplete: true },
      });

      if (role === "STUDENT") {
        await tx.studentProfile.upsert({
          where: { userId },
          create: {
            userId,
            universityId: university.id,
            departmentId: department.id,
            level,
            ...(matricNumber && { studentIdNumber: matricNumber }),
          },
          update: {
            universityId: university.id,
            departmentId: department.id,
            level,
            ...(matricNumber && { studentIdNumber: matricNumber }),
          },
        });
      } else {
        await tx.lecturerProfile.upsert({
          where: { userId },
          create: { userId, universityId: university.id, departmentId: department.id },
          update: { universityId: university.id, departmentId: department.id },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[COMPLETE_PROFILE]", err);
    captureException(err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
