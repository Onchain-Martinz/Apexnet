/**
 * One-time backfill: Apexnet no longer allows fractional/Kobo textbook
 * prices. Rounds any existing non-integer Textbook.price to the nearest
 * whole Naira (standard rounding, e.g. 99.98 -> 100), and syncs the
 * `amount` on any still-PENDING Purchase row for that textbook to match —
 * otherwise the amount-integrity check in completePurchaseByReference()
 * would compare a stale fractional snapshot against the new whole-Naira
 * amount actually sent to Flutterwave on checkout and incorrectly fail the
 * purchase. COMPLETED purchases are immutable historical records and are
 * deliberately left untouched regardless of their amount.
 *
 * Must run BEFORE the Prisma schema migration that changes
 * Textbook.price from Decimal(10,2) to Int — this script controls the exact
 * rounding policy explicitly, rather than relying on whatever implicit cast
 * `prisma db push` would otherwise apply to fractional values.
 *
 * Safe to run multiple times — only touches rows that are still fractional.
 *
 * Run:  npx ts-node --compiler-options {"module":"CommonJS"} scripts/backfill-textbook-prices-to-whole-naira.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const textbooks = await db.textbook.findMany({
    select: { id: true, title: true, price: true },
  });

  const fractional = textbooks.filter((t) => !Number.isInteger(Number(t.price)));
  console.log(`Found ${fractional.length} of ${textbooks.length} textbook(s) with a fractional (Kobo) price.`);

  for (const t of fractional) {
    const oldPrice = Number(t.price);
    const newPrice = Math.round(oldPrice);
    console.log(`\n"${t.title}" (${t.id}): ${oldPrice} -> ${newPrice}`);

    await db.textbook.update({ where: { id: t.id }, data: { price: newPrice } });

    const pendingPurchases = await db.purchase.findMany({
      where: { textbookId: t.id, status: "PENDING" },
      select: { id: true, amount: true },
    });
    for (const p of pendingPurchases) {
      console.log(`  ✓  Syncing PENDING purchase ${p.id}: amount ${p.amount.toString()} -> ${newPrice}`);
      await db.purchase.update({ where: { id: p.id }, data: { amount: newPrice } });
    }

    const completedPurchases = await db.purchase.count({ where: { textbookId: t.id, status: "COMPLETED" } });
    if (completedPurchases > 0) {
      console.log(`  ℹ  ${completedPurchases} COMPLETED purchase(s) for this textbook left untouched (historical record).`);
    }
  }

  console.log(`\nDone. ${fractional.length} textbook price(s) normalized to whole Naira.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
