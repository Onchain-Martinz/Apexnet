/**
 * Read-only verification for the courseCode-based matching architecture.
 * Replicates the exact queries in src/app/(dashboard)/student/page.tsx —
 * no modifications, no assumptions.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const PILOT_SEMESTER = 2;

async function main() {
  const courseCount = await db.course.count({ where: { semester: PILOT_SEMESTER } });
  console.log(`=== Course master data: ${courseCount} second-semester courses ===`);

  const byLevel = await db.course.groupBy({
    by: ["level"],
    where: { semester: PILOT_SEMESTER },
    _count: true,
    orderBy: { level: "asc" },
  });
  console.log(JSON.stringify(byLevel, null, 2));

  console.log("\n=== All textbooks: courseCode / courseId / status ===");
  const textbooks = await db.textbook.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      courseCode: true,
      courseId: true,
      departmentId: true,
      level: true,
      course: { select: { code: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  console.log(JSON.stringify(textbooks, null, 2));

  console.log("\n=== Per-student dashboard match replay ===");
  const students = await db.studentProfile.findMany({
    where: { departmentId: { not: null }, level: { not: null } },
    select: {
      departmentId: true,
      level: true,
      user: { select: { email: true, name: true } },
    },
  });

  for (const s of students) {
    const courses = await db.course.findMany({
      where: { departmentId: s.departmentId!, level: s.level!, semester: PILOT_SEMESTER },
      orderBy: { code: "asc" },
      select: { code: true, title: true },
    });

    const codes = courses.map((c) => c.code);
    const matched = codes.length
      ? await db.textbook.findMany({
          where: { status: "PUBLISHED", courseCode: { in: codes } },
          select: { id: true, title: true, courseCode: true },
        })
      : [];

    console.log(`\n--- ${s.user.email} (${s.user.name ?? "no name"}) — level ${s.level} ---`);
    console.log(`Courses for this dept/level/semester: ${courses.length}`);
    console.log(`Matching PUBLISHED textbooks: ${matched.length}`);
    for (const course of courses) {
      const hit = matched.find((m) => m.courseCode === course.code);
      console.log(`  ${course.code} — ${course.title}: ${hit ? `MATCHED → "${hit.title}"` : "no textbook yet"}`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
