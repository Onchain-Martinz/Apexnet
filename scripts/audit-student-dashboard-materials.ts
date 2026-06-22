/**
 * Read-only audit: traces why the Student Dashboard "Semester Materials"
 * query returns 0 results for a Psychology / 200-level student even though
 * matching textbooks exist.
 *
 * Replicates the exact query from src/app/(dashboard)/student/page.tsx
 * verbatim — no modifications, no assumptions about the cause.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // ── 1. Every "Psychology" Department row — department is scoped per
  //    university, so there can be more than one row with this name. ──────
  const psychologyDepartments = await db.department.findMany({
    where: { name: { contains: "Psychology", mode: "insensitive" } },
    select: { id: true, name: true, universityId: true, university: { select: { name: true } } },
  });
  console.log("\n=== Department rows matching 'Psychology' ===");
  console.log(JSON.stringify(psychologyDepartments, null, 2));

  // ── 2. Every StudentProfile sitting in one of those departments at level 200 ──
  const psychologyDeptIds = psychologyDepartments.map((d) => d.id);
  const students = await db.studentProfile.findMany({
    where: { departmentId: { in: psychologyDeptIds }, level: 200 },
    select: {
      id: true,
      userId: true,
      departmentId: true,
      level: true,
      department: { select: { name: true } },
      user: { select: { email: true, name: true } },
    },
  });
  console.log("\n=== StudentProfile rows: Psychology + level 200 ===");
  console.log(JSON.stringify(students, null, 2));

  // ── 3. Every textbook whose department name contains "Psychology" ──────
  const psychologyTextbooks = await db.textbook.findMany({
    where: { department: { name: { contains: "Psychology", mode: "insensitive" } } },
    select: {
      id: true,
      title: true,
      status: true,
      level: true,
      departmentId: true,
      universityId: true,
      department: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  console.log("\n=== Textbook rows: department name contains 'Psychology' ===");
  console.log(JSON.stringify(psychologyTextbooks, null, 2));

  // ── 4. Aggregate counts requested ───────────────────────────────────────
  const totalPublished = await db.textbook.count({ where: { status: "PUBLISHED" } });
  const totalPsychology = psychologyTextbooks.length;
  const totalPsychology200 = psychologyTextbooks.filter((t) => t.level === 200).length;
  const totalPsychology200Published = psychologyTextbooks.filter(
    (t) => t.level === 200 && t.status === "PUBLISHED",
  ).length;

  console.log("\n=== Aggregate counts ===");
  console.log({
    "1. Total PUBLISHED textbooks in DB": totalPublished,
    "2. Total Psychology textbooks (any status)": totalPsychology,
    "3. Total Psychology 200-level textbooks (any status)": totalPsychology200,
    "   ...of which PUBLISHED": totalPsychology200Published,
  });

  // ── 5. For each matching student, run the EXACT dashboard query verbatim ──
  console.log("\n=== Dashboard query replay, per student ===");
  for (const s of students) {
    console.log(`\n--- Student: ${s.user.email} (${s.user.name ?? "no name"}) ---`);
    console.log({
      "student.departmentId": s.departmentId,
      "student.department.name": s.department?.name ?? null,
      "student.level": s.level,
    });

    // Verbatim copy of the StudentPage query in src/app/(dashboard)/student/page.tsx
    const materials = await db.textbook.findMany({
      where: {
        status: "PUBLISHED",
        departmentId: s.departmentId,
        level: s.level,
      },
      select: { id: true, title: true, departmentId: true, level: true, status: true },
    });

    console.log(`Final dashboard query result count: ${materials.length}`);
    console.log(JSON.stringify(materials, null, 2));
  }

  if (students.length === 0) {
    console.log(
      "\nNo StudentProfile row matches departmentId IN (Psychology dept ids) AND level=200 — " +
        "the dashboard query never runs for any student in this exact shape. " +
        "Check the specific student's actual departmentId/level above against the Psychology department id(s) listed in section 1.",
    );
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
