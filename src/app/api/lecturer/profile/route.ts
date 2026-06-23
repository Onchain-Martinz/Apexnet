import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { lecturerProfileSchema } from "@/lib/validations/lecturer-profile";

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

// ── PATCH /api/lecturer/profile ─────────────────────────────────────────────
// Updates full name (User.name), academic title, university/department
// (free-text, find-or-create), phone, and bio for the authenticated
// lecturer. Bank details are managed separately via verify-bank — untouched
// here. Storage only — no withdrawals.

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "LECTURER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = lecturerProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const { name, title, universityName, departmentName, phone, bio } = parsed.data;

  const lecturerProfile = await db.lecturerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!lecturerProfile) {
    return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
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

  const [, updated] = await db.$transaction([
    db.user.update({
      where: { id: session.user.id },
      data: { name },
    }),
    db.lecturerProfile.update({
      where: { id: lecturerProfile.id },
      data: {
        title,
        universityId,
        departmentId,
        phone,
        bio: bio || null,
      },
      select: {
        id: true,
        title: true,
        phone: true,
        bio: true,
        university: { select: { name: true } },
        department: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json({ success: true, name, profile: updated });
}
