import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { uploadToR2 } from "@/lib/storage/r2";
import { captureException } from "@/lib/monitoring";
import { normalizeCourseCode } from "@/lib/textbooks/course-code";
import { isValidTextbookPrice } from "@/lib/validations/textbook";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5 MB
const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ── PATCH /api/books/[id] ───────────────────────────────────────────────────
// Lecturer-only edit of their own textbook. Accepts the same
// multipart/form-data shape as POST /api/books (title, description,
// courseCode, department, level, price, pdf, cover) — the two file fields
// are optional here: omit either to keep the textbook's existing file.
//
// Business rule: editing never breaks existing purchases/access. The
// textbook row's id never changes, so every Purchase/StudentLibrary FK
// pointing at it stays valid regardless of what fields get updated here —
// this is a plain field update, never a delete+recreate. Status (DRAFT/
// PUBLISHED/ARCHIVED) is intentionally left untouched by this route; hiding
// is the admin-only feature at PATCH /api/admin/textbooks/[id]/status.

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "LECTURER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const lecturerProfile = await db.lecturerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!lecturerProfile) {
    return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
  }

  const existing = await db.textbook.findUnique({
    where: { id },
    select: { id: true, lecturerId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Textbook not found" }, { status: 404 });
  }
  // Ownership check — a lecturer may only edit their own textbooks. Admin
  // permissions are unaffected: admins don't use this route at all (their
  // only textbook action remains Hide/Unhide).
  if (existing.lecturerId !== lecturerProfile.id) {
    return NextResponse.json({ error: "You can only edit your own textbooks" }, { status: 403 });
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
  const file = formData.get("pdf") as File | null; // optional on edit — omit to keep existing
  const coverFile = formData.get("cover") as File | null; // optional on edit — omit to keep existing

  // ── Field validation — same rules as POST /api/books ────────────────────
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

  if (file && file.size > 0) {
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 422 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File must be under 500 MB" }, { status: 422 });
    }
  }

  if (coverFile && coverFile.size > 0) {
    if (!COVER_TYPES.includes(coverFile.type)) {
      return NextResponse.json({ error: "Cover must be JPG, PNG, or WEBP" }, { status: 422 });
    }
    if (coverFile.size > MAX_COVER_SIZE) {
      return NextResponse.json({ error: "Cover must be under 5 MB" }, { status: 422 });
    }
  }

  // Same opportunistic course-match enrichment as upload.
  const matchedCourse = await db.course.findFirst({
    where: { code: courseCode },
    select: { id: true, departmentId: true },
  });

  const data: Record<string, unknown> = {
    title,
    description,
    level,
    price,
    isFree: price === 0,
    courseCode,
    ...(matchedCourse ? { courseId: matchedCourse.id, departmentId: matchedCourse.departmentId } : {}),
  };

  // ── Replace PDF (optional) ──────────────────────────────────────────────
  if (file && file.size > 0) {
    try {
      const bytes = await file.arrayBuffer();
      data.fileKey = await uploadToR2(new Uint8Array(bytes), file.type);
      data.fileSizeBytes = BigInt(file.size);
    } catch (error) {
      console.error("[books/edit] R2 upload failed", error);
      captureException(error, { userId: session.user.id, extra: { title, textbookId: id } });
      return NextResponse.json({ error: "File upload failed. Please try again." }, { status: 502 });
    }
  }

  // ── Replace cover image (optional) ──────────────────────────────────────
  if (coverFile && coverFile.size > 0 && COVER_TYPES.includes(coverFile.type)) {
    try {
      const coverBytes = await coverFile.arrayBuffer();
      data.coverImageKey = await uploadToR2(new Uint8Array(coverBytes), coverFile.type, "covers");
    } catch (error) {
      console.error("[books/edit] Cover upload failed — continuing without cover change", error);
    }
  }

  const updated = await db.textbook.update({
    where: { id },
    data,
    select: { id: true },
  });

  return NextResponse.json({ success: true, id: updated.id });
}
