import type { Prisma, TextbookStatus } from "@prisma/client";
import { db } from "@/lib/db";

// ── Reader access control ───────────────────────────────────────────────────
// Shared by /textbooks/[id]/read and /api/books/[id]/file so both gates stay
// in sync. Evaluation order matters:
//   1. ADMIN   → allow (any status, no purchase required)
//   2. Owner   → allow (any status — lecturer can always read their own work)
//   3. Has StudentLibrary entry → allow (purchase retained even if archived)
//   4. Not PUBLISHED → deny (content is draft/archived and caller isn't entitled)
//   5. Free + PUBLISHED → allow (auto-granted on read, see grantFreeLibraryAccess)
//   6. Otherwise → deny

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
  userRole: string,
): Promise<AccessResult> {
  const isOwner = textbook.lecturer.userId === userId;
  const isFree = textbook.isFree || Number(textbook.price) === 0;

  // Rule 1 — Admins have unrestricted read access for content moderation.
  if (userRole === "ADMIN") {
    return { allowed: true, isOwner, isFree };
  }

  // Rule 2 — Lecturer-owner can always read their own work regardless of status.
  if (isOwner) {
    return { allowed: true, isOwner: true, isFree };
  }

  // Rule 3 — Check StudentLibrary BEFORE the status gate.
  // Purchasers retain access even if the textbook is later archived.
  const owned = await db.studentLibrary.findUnique({
    where: { studentId_textbookId: { studentId: userId, textbookId: textbook.id } },
    select: { id: true },
  });
  if (owned) {
    return { allowed: true, isOwner: false, isFree };
  }

  // Rule 4 — Non-owners with no library entry cannot access unpublished content.
  if (textbook.status !== "PUBLISHED") {
    return { allowed: false, isOwner: false, isFree };
  }

  // Rule 5 — Any authenticated user may read a free published textbook.
  // The caller must call grantFreeLibraryAccess() after this to record the access.
  if (isFree) {
    return { allowed: true, isOwner: false, isFree: true };
  }

  // Rule 6 — Paid published textbook, no library entry → deny.
  return { allowed: false, isOwner: false, isFree };
}

// Adds a free, PUBLISHED textbook to a user's library on first read
// (purchaseId: null — no associated Purchase). Idempotent: safe to call repeatedly.
export async function grantFreeLibraryAccess(textbookId: string, studentId: string) {
  await db.studentLibrary.upsert({
    where: { studentId_textbookId: { studentId, textbookId } },
    create: { studentId, textbookId, purchaseId: null },
    update: {},
  });
}
