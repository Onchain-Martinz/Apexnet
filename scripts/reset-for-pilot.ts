/**
 * Pilot reset — wipes all user-generated content (students, lecturers,
 * textbooks, purchases, libraries, payouts, withdrawal requests, verification
 * tokens) and three named test/junk university+department rows, so the
 * Psychology pilot launches against a clean database.
 *
 * Preserves: the admin account, course master data (39 Psychology courses),
 * and the 5 legitimate seeded universities/departments.
 *
 * Safety:
 *  - Hard pre-flight aborts (no deletion attempted) if the admin account
 *    doesn't match exactly what was verified in the audit, if the course
 *    count isn't exactly 39, or if the named junk universities have any
 *    courses/textbooks attached (which would mean they're not actually junk).
 *  - Running without CONFIRM_RESET=true only prints counts and exits.
 *  - Even with the flag set, it pauses 5 seconds before deleting.
 *  - The entire delete sequence runs inside one db.$transaction([...]) —
 *    all-or-nothing, no partial resets possible.
 *
 * Run:  CONFIRM_RESET=true npx ts-node --compiler-options {"module":"CommonJS"} scripts/reset-for-pilot.ts
 */
import { PrismaClient, Role } from "@prisma/client";

const db = new PrismaClient();

const EXPECTED_ADMIN_EMAIL = "smileydbandit22@gmail.com";

// Exact-name-matched, identified during the launch-reset audit. Idempotent —
// if these don't exist on a future run (already deleted), the deleteMany
// simply matches zero rows. Never matches the 5 legitimate seeded
// universities (University of Lagos, Ahmadu Bello University, Obafemi
// Awolowo University, University of Nigeria, Imo state university).
const JUNK_UNIVERSITY_NAMES = ["Futo", "imo", "m l. ;k,"];

async function main() {
  // ── Pre-flight: admin verification — hard abort, no deletion attempted ──
  const admins = await db.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true, email: true, name: true },
  });
  if (admins.length !== 1 || admins[0].email !== EXPECTED_ADMIN_EMAIL) {
    console.error("ABORT — admin verification failed. Expected exactly 1 admin with email", EXPECTED_ADMIN_EMAIL);
    console.error("Found:", JSON.stringify(admins, null, 2));
    process.exit(1);
  }
  console.log("✓ Admin verified:", admins[0]);

  // ── Pre-flight: junk university verification — hard abort if anything
  // looks unexpected (wrong count, or any course/textbook attached) ───────
  const junkUniversities = await db.university.findMany({
    where: { name: { in: JUNK_UNIVERSITY_NAMES } },
    select: {
      id: true,
      name: true,
      departments: { select: { id: true, name: true, _count: { select: { courses: true } } } },
      _count: { select: { textbooks: true } },
    },
  });

  if (junkUniversities.length !== JUNK_UNIVERSITY_NAMES.length) {
    console.error(
      `ABORT — expected ${JUNK_UNIVERSITY_NAMES.length} junk universities (${JUNK_UNIVERSITY_NAMES.join(", ")}), found ${junkUniversities.length}.`,
    );
    console.error(JSON.stringify(junkUniversities, null, 2));
    process.exit(1);
  }

  for (const uni of junkUniversities) {
    if (uni._count.textbooks > 0) {
      console.error(`ABORT — junk university "${uni.name}" has ${uni._count.textbooks} textbook(s) attached. Refusing to delete.`);
      process.exit(1);
    }
    for (const dept of uni.departments) {
      if (dept._count.courses > 0) {
        console.error(`ABORT — department "${dept.name}" under junk university "${uni.name}" has ${dept._count.courses} course(s) attached. Refusing to delete.`);
        process.exit(1);
      }
    }
  }
  console.log("✓ Junk universities verified safe to delete:", junkUniversities.map((u) => u.name));

  const junkUniversityIds = junkUniversities.map((u) => u.id);
  const junkDepartmentIds = junkUniversities.flatMap((u) => u.departments.map((d) => d.id));

  // ── BEFORE counts ─────────────────────────────────────────────────────────
  const before = {
    admins: admins.length,
    students: await db.user.count({ where: { role: Role.STUDENT } }),
    lecturers: await db.user.count({ where: { role: Role.LECTURER } }),
    textbooks: await db.textbook.count(),
    purchases: await db.purchase.count(),
    universities: await db.university.count(),
    courses: await db.course.count(),
  };
  console.log("\n=== BEFORE ===");
  console.log(JSON.stringify(before, null, 2));

  if (before.courses !== 39) {
    console.error(`ABORT — expected exactly 39 courses, found ${before.courses}. Refusing to proceed.`);
    process.exit(1);
  }

  if (process.env.CONFIRM_RESET !== "true") {
    console.log('\nCONFIRM_RESET is not set to "true" — exiting without deleting anything.');
    console.log(
      "Re-run as:  CONFIRM_RESET=true npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' scripts/reset-for-pilot.ts",
    );
    return;
  }

  console.log("\nCONFIRM_RESET=true — proceeding with destructive reset in 5 seconds. Ctrl+C to abort.");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // ── Single atomic transaction — all-or-nothing, no partial resets ───────
  // Deletion order respects FK Restrict constraints verified against the
  // current schema: studentLibrary/purchases before textbooks; purchases/
  // payouts/textbooks before users; departments/universities last (their
  // only real dependents — StudentProfile/LecturerProfile rows — are already
  // gone via the User cascade by that point).
  const [
    readingProgress,
    studentLibrary,
    purchases,
    withdrawalRequests,
    payouts,
    textbooks,
    verificationTokens,
    users,
    departments,
    universities,
  ] = await db.$transaction([
    db.readingProgress.deleteMany({}),
    db.studentLibrary.deleteMany({}),
    db.purchase.deleteMany({}),
    db.withdrawalRequest.deleteMany({}),
    db.payout.deleteMany({}),
    db.textbook.deleteMany({}),
    db.verificationToken.deleteMany({}),
    db.user.deleteMany({ where: { role: { not: Role.ADMIN } } }),
    db.department.deleteMany({ where: { id: { in: junkDepartmentIds } } }),
    db.university.deleteMany({ where: { id: { in: junkUniversityIds } } }),
  ]);

  console.log("\n=== DELETED ===");
  console.log(
    JSON.stringify(
      {
        readingProgress: readingProgress.count,
        studentLibrary: studentLibrary.count,
        purchases: purchases.count,
        withdrawalRequests: withdrawalRequests.count,
        payouts: payouts.count,
        textbooks: textbooks.count,
        verificationTokens: verificationTokens.count,
        usersNonAdmin: users.count,
        junkDepartments: departments.count,
        junkUniversities: universities.count,
      },
      null,
      2,
    ),
  );

  // ── AFTER counts ──────────────────────────────────────────────────────────
  const after = {
    users: await db.user.count(),
    admins: await db.user.count({ where: { role: Role.ADMIN } }),
    students: await db.user.count({ where: { role: Role.STUDENT } }),
    lecturers: await db.user.count({ where: { role: Role.LECTURER } }),
    studentProfiles: await db.studentProfile.count(),
    lecturerProfiles: await db.lecturerProfile.count(),
    textbooks: await db.textbook.count(),
    purchases: await db.purchase.count(),
    studentLibrary: await db.studentLibrary.count(),
    readingProgress: await db.readingProgress.count(),
    withdrawalRequests: await db.withdrawalRequest.count(),
    payouts: await db.payout.count(),
    verificationTokens: await db.verificationToken.count(),
    universities: await db.university.count(),
    departments: await db.department.count(),
    courses: await db.course.count(),
  };
  console.log("\n=== AFTER ===");
  console.log(JSON.stringify(after, null, 2));

  const survivingAdmin = await db.user.findUnique({
    where: { id: admins[0].id },
    select: { email: true, role: true, name: true },
  });
  console.log("\nAdmin survival check:", JSON.stringify(survivingAdmin));

  const remainingUniversities = await db.university.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });
  console.log("Remaining universities:", remainingUniversities.map((u) => u.name));

  console.log("\n✅  Pilot reset complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
