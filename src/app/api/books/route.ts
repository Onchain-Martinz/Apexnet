import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { uploadToR2 } from "@/lib/storage/r2";
import { captureException } from "@/lib/monitoring";
import { normalizeCourseCode } from "@/lib/textbooks/course-code";
import { isValidTextbookPrice } from "@/lib/validations/textbook";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5 MB
const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ── GET /api/books ─────────────────────────────────────────────────────────
// Returns textbooks belonging to the authenticated lecturer.

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lecturerProfile = await db.lecturerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!lecturerProfile) {
    return NextResponse.json({ books: [] });
  }

  const books = await db.textbook.findMany({
    where: { lecturerId: lecturerProfile.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      price: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ books });
}

// ── POST /api/books ────────────────────────────────────────────────────────
// Accepts multipart/form-data: title, description, courseCode, department,
// level, price, pdf. Uploads the PDF directly to Cloudflare R2 — never
// touches local disk.
// Verified lecturers: status=PUBLISHED, publishedAt=now (immediately visible).
// Unverified lecturers: status=DRAFT.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "LECTURER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() ?? "";
  const department = (formData.get("department") as string | null)?.trim() ?? "";
  const courseCode = normalizeCourseCode((formData.get("courseCode") as string | null) ?? "");
  const levelRaw = formData.get("level") as string | null;
  const priceRaw = formData.get("price") as string | null;
  const file = formData.get("pdf") as File | null;
  const coverFile = formData.get("cover") as File | null;

  // ── Field validation ────────────────────────────────────────────────────
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 422 });
  }
  if (!description) {
    return NextResponse.json({ error: "Description is required" }, { status: 422 });
  }
  if (!courseCode) {
    return NextResponse.json({ error: "Course code is required" }, { status: 422 });
  }
  if (!department) {
    return NextResponse.json({ error: "Department is required" }, { status: 422 });
  }

  const level = parseInt(levelRaw ?? "", 10);
  if (!levelRaw || ![100, 200, 300, 400, 500].includes(level)) {
    return NextResponse.json({ error: "Select a valid level" }, { status: 422 });
  }

  // Course matching is courseCode-driven (no dropdown) — if the code happens
  // to match a seeded Course (e.g. the Psychology pilot catalogue), opportunistically
  // link departmentId/courseId so department-scoped browsing stays in sync.
  // Course.code is unique per-department, not globally, so this is a best-effort match.
  const matchedCourse = await db.course.findFirst({
    where: { code: courseCode },
    select: { id: true, departmentId: true },
  });

  const price = parseFloat(priceRaw ?? "");
  if (priceRaw === null || priceRaw === "" || isNaN(price) || price < 0) {
    return NextResponse.json({ error: "Price must be 0 or greater" }, { status: 422 });
  }
  if (!isValidTextbookPrice(price)) {
    return NextResponse.json(
      { error: "Price must be a whole Naira amount — Kobo is not supported" },
      { status: 422 },
    );
  }

  if (!file) {
    return NextResponse.json({ error: "PDF is required" }, { status: 422 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 422 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File must be under 50 MB" }, { status: 422 });
  }

  if (coverFile && coverFile.size > 0) {
    if (!COVER_TYPES.includes(coverFile.type)) {
      return NextResponse.json({ error: "Cover must be JPG, PNG, or WEBP" }, { status: 422 });
    }
    if (coverFile.size > MAX_COVER_SIZE) {
      return NextResponse.json({ error: "Cover must be under 5 MB" }, { status: 422 });
    }
  }

  // ── Lookup lecturer profile ─────────────────────────────────────────────
  const lecturerProfile = await db.lecturerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, verified: true, universityId: true },
  });

  if (!lecturerProfile) {
    return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
  }

  // ── Resolve department (find-or-create) ─────────────────────────────────
  // The lecturer's typed department must always be persisted as a real
  // departmentId — previously it was validated as required input and then
  // discarded, leaving Textbook.departmentId null unless courseCode happened
  // to match a seeded Course (which only exists for the Psychology pilot
  // catalogue).
  //
  // When the lecturer's own university is unknown (the common case for
  // admin-created accounts), prefer reusing an existing department with the
  // same name across ANY university over guessing a fallback university —
  // guessing produced two divergent "Sociology" rows in practice (one
  // arbitrarily scoped to the oldest University row in the table, unrelated
  // to this pilot, while the actual students' department lived under a
  // different one) and silently excluded an otherwise-matching textbook from
  // "Recommended For Your Department". Only fall back to creating a new
  // department under the platform's first university record when no
  // existing department with this name exists anywhere — still a
  // single-pilot-university simplification for that one remaining case, not
  // general multi-university resolution.
  let departmentId: string | null = null;
  if (lecturerProfile.universityId) {
    const resolvedDepartment =
      (await db.department.findFirst({
        where: { universityId: lecturerProfile.universityId, name: { equals: department, mode: "insensitive" } },
        select: { id: true },
      })) ??
      (await db.department.create({
        data: { universityId: lecturerProfile.universityId, name: department },
        select: { id: true },
      }));
    departmentId = resolvedDepartment.id;
  } else {
    const existingByName = await db.department.findFirst({
      where: { name: { equals: department, mode: "insensitive" } },
      select: { id: true },
    });

    if (existingByName) {
      departmentId = existingByName.id;
    } else {
      const fallbackUniversity = await db.university.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (fallbackUniversity) {
        const created = await db.department.create({
          data: { universityId: fallbackUniversity.id, name: department },
          select: { id: true },
        });
        departmentId = created.id;
      }
    }
  }

  // ── Upload PDF to R2 ───────────────────────────────────────────────────
  let fileKey: string;
  try {
    const bytes = await file.arrayBuffer();
    fileKey = await uploadToR2(new Uint8Array(bytes), file.type);
  } catch (error) {
    console.error("[books/upload] R2 upload failed", error);
    captureException(error, {
      userId: session.user.id,
      extra: { title, fileSizeBytes: file.size },
    });
    return NextResponse.json({ error: "File upload failed. Please try again." }, { status: 502 });
  }

  // ── Upload cover image to R2 (optional) ────────────────────────────────
  let coverImageKey: string | null = null;
  if (coverFile && coverFile.size > 0 && COVER_TYPES.includes(coverFile.type)) {
    try {
      const coverBytes = await coverFile.arrayBuffer();
      coverImageKey = await uploadToR2(new Uint8Array(coverBytes), coverFile.type, "covers");
    } catch (error) {
      console.error("[books/upload] Cover upload failed — continuing without cover", error);
    }
  }

  // ── Create textbook record ──────────────────────────────────────────────
  const isVerified = lecturerProfile.verified;
  const now = new Date();

  const textbook = await db.textbook.create({
    data: {
      title,
      description,
      level,
      price,
      fileKey,
      fileSizeBytes: BigInt(file.size),
      isFree: price === 0,
      lecturerId: lecturerProfile.id,
      coverImageKey,
      status: isVerified ? "PUBLISHED" : "DRAFT",
      publishedAt: isVerified ? now : null,
      courseCode,
      departmentId,
      ...(matchedCourse ? { courseId: matchedCourse.id } : {}),
    },
    select: { id: true },
  });

  return NextResponse.json({ success: true, id: textbook.id }, { status: 201 });
}
