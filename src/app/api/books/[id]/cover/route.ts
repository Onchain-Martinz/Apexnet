import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { streamFromR2 } from "@/lib/storage/r2";

// GET /api/books/[id]/cover
// Public — cover images are not protected content (same as a book thumbnail).
// Cache aggressively: covers rarely change after upload.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const textbook = await db.textbook.findUnique({
    where: { id },
    select: { coverImageKey: true },
  });

  if (!textbook?.coverImageKey) {
    return new NextResponse(null, { status: 404 });
  }

  let r2: Awaited<ReturnType<typeof streamFromR2>>;
  try {
    r2 = await streamFromR2(textbook.coverImageKey);
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  return new Response(r2.stream, {
    headers: {
      "Content-Type": r2.contentType ?? "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(r2.contentLength != null
        ? { "Content-Length": String(r2.contentLength) }
        : {}),
    },
  });
}
