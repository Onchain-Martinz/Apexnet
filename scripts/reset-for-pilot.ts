/**
 * Pilot reset — wipes all user-generated content (students, lecturers,
 * textbooks, purchases, libraries, payouts, withdrawal requests) so the
 * Psychology pilot launches against a clean database.
 *
 * Preserves: admin accounts, roles, course master data (universities,
 * departments, courses), and all other system configuration.
 *
 * Safety: running this without CONFIRM_RESET=true only prints counts and
 * exits — it never deletes anything by accident. Even with the flag set,
 * it pauses 5 seconds before deleting so there's a window to Ctrl+C.
 *
 * Run:  CONFIRM_RESET=true npx ts-node --compiler-options {"module":"CommonJS"} scripts/reset-for-pilot.ts
 */
import { PrismaClient, Role } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const counts = {
    students: await db.user.count({ where: { role: Role.STUDENT } }),
    lecturers: await db.user.count({ where: { role: Role.LECTURER } }),
    admins: await db.user.count({ where: { role: Role.ADMIN } }),
    textbooks: await db.textbook.count(),
    purchases: await db.purchase.count(),
    studentLibrary: await db.studentLibrary.count(),
    readingProgress: await db.readingProgress.count(),
    payouts: await db.payout.count(),
    withdrawalRequests: await db.withdrawalRequest.count(),
    courses: await db.course.count(),
    departments: await db.department.count(),
    universities: await db.university.count(),
  };

  console.log("=== Pilot reset — current counts ===");
  console.log(JSON.stringify(counts, null, 2));
  console.log(
    "\nWill DELETE: students, lecturers, textbooks, purchases, student library, " +
      "reading progress, payouts, withdrawal requests.",
  );
  console.log(
    "Will KEEP:   admin accounts, roles, course master data, departments, universities.\n",
  );

  if (process.env.CONFIRM_RESET !== "true") {
    console.log('CONFIRM_RESET is not set to "true" — exiting without deleting anything.');
    console.log(
      "Re-run as:  CONFIRM_RESET=true npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' scripts/reset-for-pilot.ts",
    );
    return;
  }

  console.log("CONFIRM_RESET=true — proceeding with destructive reset in 5 seconds. Ctrl+C to abort.");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Deletion order respects FK restrict constraints: anything that blocks
  // deleting a User or Textbook is removed first. Account/Session/profile
  // rows cascade automatically once the owning non-admin User is deleted.
  const readingProgress = await db.readingProgress.deleteMany({});
  const studentLibrary = await db.studentLibrary.deleteMany({});
  const purchases = await db.purchase.deleteMany({});
  const withdrawalRequests = await db.withdrawalRequest.deleteMany({});
  const payouts = await db.payout.deleteMany({});
  const textbooks = await db.textbook.deleteMany({});
  const users = await db.user.deleteMany({ where: { role: { not: Role.ADMIN } } });

  console.log("\n=== Deleted ===");
  console.log(
    JSON.stringify(
      {
        readingProgress: readingProgress.count,
        studentLibrary: studentLibrary.count,
        purchases: purchases.count,
        withdrawalRequests: withdrawalRequests.count,
        payouts: payouts.count,
        textbooks: textbooks.count,
        usersNonAdmin: users.count,
      },
      null,
      2,
    ),
  );

  const remainingAdmins = await db.user.count({ where: { role: Role.ADMIN } });
  const remainingCourses = await db.course.count();
  const remainingDepartments = await db.department.count();
  console.log(`\nRemaining admin accounts: ${remainingAdmins}`);
  console.log(`Remaining course master data: ${remainingCourses}`);
  console.log(`Remaining departments: ${remainingDepartments}`);
  console.log("\n✅  Pilot reset complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
