import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { checkTextbookAccess, grantFreeLibraryAccess } from "@/lib/textbooks/access";
import { streamFromR2 } from "@/lib/storage/r2";

// ── GET /api/books/[id]/file ────────────────────────────────────────────────
// Streams the textbook PDF inline for in-app reading.
// The PDF is fetched from Cloudflare R2 (private bucket) and piped directly
// to the response — no local disk I/O, no full-file buffering.
// Access: the owning lecturer (any status), or PUBLISHED textbooks that are
// either free or owned via StudentLibrary. See lib/textbooks/access.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const textbook = await db.textbook.findUnique({
    where: { id },
    select: {
      id: true,
      fileKey: true,
      status: true,
      isFree: true,
      price: true,
      lecturer: { select: { userId: true } },
    },
  });

  if (!textbook || !textbook.fileKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await checkTextbookAccess(textbook, session.user.id, session.user.role);
  if (!access.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (access.isFree && !access.isOwner) {
    await grantFreeLibraryAccess(textbook.id, session.user.id);
  }

  // ── Stream from R2 ─────────────────────────────────────────────────────
  // streamFromR2 throws if the object does not exist or R2 returns an error.
  // We surface both cases as 404 — the caller only needs to know the file
  // is unavailable, not the internal reason.
  let r2Object: Awaited<ReturnType<typeof streamFromR2>>;
  try {
    r2Object = await streamFromR2(textbook.fileKey);
  } catch (error) {
    console.error(`[books/file] R2 fetch failed for key "${textbook.fileKey}"`, error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Content-Disposition": "inline",
    "Cache-Control": "private, no-store",
  };

  if (r2Object.contentLength !== undefined) {
    headers["Content-Length"] = String(r2Object.contentLength);
  }

  return new NextResponse(r2Object.stream, { headers });
}
