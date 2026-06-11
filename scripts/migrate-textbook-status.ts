/**
 * One-off data migration script — run BEFORE `prisma db push`.
 *
 * Problem: Postgres can't remove enum values with existing rows using them.
 * Solution:
 *   1. Add new enum values to the live type (additive — always safe).
 *   2. Remap existing rows to the new values.
 *   3. db push can now safely drop the old values (no rows use them).
 *
 * Old → New mapping:
 *   PENDING  → DRAFT
 *   APPROVED → PUBLISHED
 *   REJECTED → ARCHIVED
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-textbook-status.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Step 1: Adding new enum values to TextbookStatus…");
  // ADD VALUE is idempotent with IF NOT EXISTS; safe to run multiple times.
  await db.$executeRaw`ALTER TYPE "TextbookStatus" ADD VALUE IF NOT EXISTS 'DRAFT'`;
  await db.$executeRaw`ALTER TYPE "TextbookStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED'`;
  await db.$executeRaw`ALTER TYPE "TextbookStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED'`;
  console.log("  ✓ DRAFT, PUBLISHED, ARCHIVED added\n");

  console.log("Step 2: Remapping existing rows…");
  const pending = await db.$executeRaw`
    UPDATE textbooks SET status = 'DRAFT'::"TextbookStatus"
    WHERE status = 'PENDING'::"TextbookStatus"
  `;
  console.log(`  PENDING  → DRAFT     : ${pending} row(s)`);

  const approved = await db.$executeRaw`
    UPDATE textbooks SET status = 'PUBLISHED'::"TextbookStatus"
    WHERE status = 'APPROVED'::"TextbookStatus"
  `;
  console.log(`  APPROVED → PUBLISHED : ${approved} row(s)`);

  const rejected = await db.$executeRaw`
    UPDATE textbooks SET status = 'ARCHIVED'::"TextbookStatus"
    WHERE status = 'REJECTED'::"TextbookStatus"
  `;
  console.log(`  REJECTED → ARCHIVED  : ${rejected} row(s)`);

  console.log("\n✅  Done. Now run: npx prisma db push --accept-data-loss");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
