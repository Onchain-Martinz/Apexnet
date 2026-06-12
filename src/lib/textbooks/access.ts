import type { Prisma, TextbookStatus } from "@prisma/client";
import { db } from "@/lib/db";

// ── Reader access control ───────────────────────────────────────────────────
// Shared by /textbooks/[id]/read and /api/books/[id]/file so both gates stay
// in sync. A user may read a textbook's file if:
//   1. They are the uploading lecturer (any status), OR
//   2. The textbook is PUBLISHED and free, OR
//   3. The textbook is PUBLISHED and they own a StudentLibrary entry for it.

export interface AccessTextbook {
  id: string;
  status: TextbookStatus;
  isFree: boolean;
  price: Prisma.Decimal | number | string;
  lecturer: { userId: string };
}

export interface AccessResult {
  allowed: boolean;
  isOwner: boolean;
  isFree: boolean;
}

export async function checkTextbookAccess(
  textbook: AccessTextbook,
  userId: string,
): Promise<AccessResult> {
  const isOwner = textbook.lecturer.userId === userId;
  const isFree = textbook.isFree || Number(textbook.price) === 0;

  if (isOwner) {
    return { allowed: true, isOwner, isFree };
  }

  if (textbook.status !== "PUBLISHED") {
    return { allowed: false, isOwner, isFree };
  }

  if (isFree) {
    return { allowed: true, isOwner, isFree };
  }

  const owns = await db.studentLibrary.findUnique({
    where: { studentId_textbookId: { studentId: userId, textbookId: textbook.id } },
    select: { id: true },
  });

  return { allowed: !!owns, isOwner, isFree };
}

// Adds a free, PUBLISHED textbook to a user's library on first access
// (purchaseId: null — no associated Purchase). Safe to call repeatedly.
export async function grantFreeLibraryAccess(textbookId: string, studentId: string) {
  await db.studentLibrary.upsert({
    where: { studentId_textbookId: { studentId, textbookId } },
    create: { studentId, textbookId, purchaseId: null },
    update: {},
  });
}
