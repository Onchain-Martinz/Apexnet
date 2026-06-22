/**
 * One-time backfill: course matching switched from the Textbook.courseId FK
 * relation to a plain Textbook.courseCode string compared against Course.code.
 * Any textbook uploaded through the old Course dropdown has courseId set but
 * courseCode still null — without this backfill those textbooks vanish from
 * the student dashboard the moment the new matching logic ships.
 *
 * Safe to run multiple times (only touches rows where courseCode IS NULL).
 *
 * Run:  npx ts-node --compiler-options {"module":"CommonJS"} scripts/backfill-textbook-course-code.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const candidates = await db.textbook.findMany({
    where: { courseId: { not: null }, courseCode: null },
    select: { id: true, title: true, course: { select: { code: true } } },
  });

  console.log(`Found ${candidates.length} textbook(s) with courseId set but courseCode missing.`);

  let updated = 0;
  for (const textbook of candidates) {
    const code = textbook.course?.code;
    if (!code) continue;
    await db.textbook.update({
      where: { id: textbook.id },
      data: { courseCode: code.toUpperCase() },
    });
    console.log(`  ✓  "${textbook.title}" → ${code.toUpperCase()}`);
    updated++;
  }

  console.log(`\nBackfilled ${updated} of ${candidates.length} textbook(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
