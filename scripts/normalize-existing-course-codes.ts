/**
 * One-time backfill: course-code matching now requires canonical form
 * (normalizeCourseCode — uppercase, no spaces/hyphens/underscores). Any
 * textbook uploaded before that normalization was added to POST /api/books
 * could have a non-canonical courseCode (e.g. "PSY-202") sitting in the DB.
 * That breaks matching at the SQL level — the student dashboard's
 * `courseCode: { in: courseCodes } }` filter is an exact-string match
 * against canonical codes, so a stored "PSY-202" would never be returned
 * even though normalizeCourseCode("PSY-202") === normalizeCourseCode("PSY202").
 *
 * Safe to run multiple times — only updates rows whose stored value isn't
 * already canonical.
 *
 * Run:  npx ts-node --compiler-options {"module":"CommonJS"} scripts/normalize-existing-course-codes.ts
 */
import { PrismaClient } from "@prisma/client";
import { normalizeCourseCode } from "../src/lib/textbooks/course-code";

const db = new PrismaClient();

async function main() {
  const rows = await db.textbook.findMany({
    where: { courseCode: { not: null } },
    select: { id: true, title: true, courseCode: true },
  });

  console.log(`Found ${rows.length} textbook(s) with courseCode set.`);

  let updated = 0;
  for (const row of rows) {
    const canonical = normalizeCourseCode(row.courseCode!);
    if (canonical === row.courseCode) continue;

    await db.textbook.update({
      where: { id: row.id },
      data: { courseCode: canonical },
    });
    console.log(`  ✓  "${row.title}": ${JSON.stringify(row.courseCode)} → ${JSON.stringify(canonical)}`);
    updated++;
  }

  console.log(`\nNormalized ${updated} of ${rows.length} textbook(s). ${rows.length - updated} were already canonical.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
