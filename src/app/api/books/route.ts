import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

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
// Accepts multipart/form-data: title, description, department, level, price, pdf.
// Verified lecturers: status=PUBLISHED, publishedAt=now (immediately visible).
// Unverified lecturers: status=DRAFT (future flow — not yet built).

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
  const levelRaw = formData.get("level") as string | null;
  const priceRaw = formData.get("price") as string | null;
  const file = formData.get("pdf") as File | null;

  // ── Field validation ────────────────────────────────────────────────────
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 422 });
  }
  if (!description) {
    return NextResponse.json({ error: "Description is required" }, { status: 422 });
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

  if (!file) {
    return NextResponse.json({ error: "PDF is required" }, { status: 422 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 422 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File must be under 50 MB" }, { status: 422 });
  }

  // ── Save file to public/uploads/ ────────────────────────────────────────
  const uploadsDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const filename = `${randomUUID()}.pdf`;
  const filepath = join(uploadsDir, filename);
  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));

  const fileKey = `/uploads/${filename}`;

  // ── Lookup lecturer profile ─────────────────────────────────────────────
  const lecturerProfile = await db.lecturerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, verified: true },
  });

  if (!lecturerProfile) {
    return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
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
      status: isVerified ? "PUBLISHED" : "DRAFT",
      publishedAt: isVerified ? now : null,
    },
    select: { id: true },
  });

  return NextResponse.json({ success: true, id: textbook.id }, { status: 201 });
}
