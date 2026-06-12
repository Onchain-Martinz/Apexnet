import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { checkTextbookAccess, grantFreeLibraryAccess } from "@/lib/textbooks/access";

// ── GET /api/books/[id]/file ────────────────────────────────────────────────
// Streams the textbook PDF inline for in-app reading.
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

  const access = await checkTextbookAccess(textbook, session.user.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (access.isFree && !access.isOwner) {
    await grantFreeLibraryAccess(textbook.id, session.user.id);
  }

  const relativePath = textbook.fileKey.replace(/^\//, "");
  const filePath = join(process.cwd(), "public", relativePath);

  let file: Buffer;
  try {
    file = await readFile(filePath);
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
