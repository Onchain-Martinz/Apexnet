/**
 * Narrow, manual deletion of up to 3 disposable Google TEST accounts so their
 * emails can be reused for fresh production signup tests. It deletes the USER
 * row only and relies on Prisma cascades to remove the linked account /
 * studentProfile / sessions / OTP rows. It never touches shared master data
 * (universities / departments / courses) or any other user.
 *
 * A user is deleted ONLY if EVERY one of these holds (else it is SKIPPED with a
 * printed reason):
 *   1. email is one of the 3 explicit targets below
 *   2. user exists
 *   3. hashedPassword is null (passwordless account)
 *   4. has a linked Google account
 *   5-10. zero rows in: purchases, studentLibrary, readingProgress,
 *         textbooks, payouts, withdrawalRequests
 *
 * Safety:
 *   • Only the 3 explicit emails are ever considered — no broadening.
 *   • DRY-RUN by default — prints the plan only. It writes ONLY when you run it
 *     with CONFIRM_FREE_TEST_EMAILS=true.
 *   • In apply mode each user is RE-ASSESSED immediately before deletion, so a
 *     row that gained data since the initial read is never deleted.
 *   • Shared/live note: localhost and production use the same Neon DB — this
 *     deletes from the shared database.
 *
 * Dry-run:  npx ts-node --compiler-options {"module":"CommonJS"} scripts/free-test-emails.ts
 * Apply:    CONFIRM_FREE_TEST_EMAILS=true npx ts-node --compiler-options {"module":"CommonJS"} scripts/free-test-emails.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// The exact, closed set of accounts this script may delete.
const TARGET_EMAILS = [
  "iwualakizitto@gmail.com",
  "cryptotitan101@gmail.com",
  "kizittoapexnet@gmail.com",
];

const APPLY = process.env.CONFIRM_FREE_TEST_EMAILS === "true";

type Assessment = {
  email: string;
  found: boolean;
  eligible: boolean;
  reasons: string[];
  id?: string;
  summaryLines: string[];
};

// Fetches a user and every relation that matters for the eligibility gate.
async function assess(email: string): Promise<Assessment> {
  const u = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      role: true,
      profileComplete: true,
      hashedPassword: true,
      accounts: { select: { provider: true } },
      studentProfile: { select: { id: true } },
      lecturerProfile: { select: { id: true } },
      emailVerificationOtp: { select: { userId: true } },
      passwordResetOtp: { select: { userId: true } },
    },
  });

  if (!u) {
    return { email, found: false, eligible: false, reasons: ["not found in DB"], summaryLines: [] };
  }

  const hasPassword = u.hashedPassword !== null;
  const hasGoogleAccount = u.accounts.some((a) => a.provider === "google");
  const hasStudentProfile = u.studentProfile !== null;
  const hasLecturerProfile = u.lecturerProfile !== null;

  const [purchases, studentLibrary, readingProgress, sessions] = await Promise.all([
    db.purchase.count({ where: { studentId: u.id } }),
    db.studentLibrary.count({ where: { studentId: u.id } }),
    db.readingProgress.count({ where: { studentId: u.id } }),
    db.session.count({ where: { userId: u.id } }),
  ]);

  // Lecturer-owned records only exist if there is a lecturerProfile.
  let textbooks = 0;
  let payouts = 0;
  let withdrawalRequests = 0;
  if (u.lecturerProfile) {
    [textbooks, payouts, withdrawalRequests] = await Promise.all([
      db.textbook.count({ where: { lecturerId: u.lecturerProfile.id } }),
      db.payout.count({ where: { lecturerId: u.lecturerProfile.id } }),
      db.withdrawalRequest.count({ where: { lecturerId: u.lecturerProfile.id } }),
    ]);
  }

  const emailVerificationOtp = u.emailVerificationOtp ? 1 : 0;
  const passwordResetOtp = u.passwordResetOtp ? 1 : 0;

  const summaryLines = [
    `id:                   ${u.id}`,
    `email:                ${u.email}`,
    `role:                 ${u.role}`,
    `profileComplete:      ${u.profileComplete}`,
    `hasPassword:          ${hasPassword}`,
    `hasGoogleAccount:     ${hasGoogleAccount}`,
    `hasStudentProfile:    ${hasStudentProfile}`,
    `hasLecturerProfile:   ${hasLecturerProfile}`,
    `purchases:            ${purchases}`,
    `studentLibrary:       ${studentLibrary}`,
    `readingProgress:      ${readingProgress}`,
    `textbooks:            ${textbooks}`,
    `payouts:              ${payouts}`,
    `withdrawalRequests:   ${withdrawalRequests}`,
    `sessions:             ${sessions}`,
    `emailVerificationOtp: ${emailVerificationOtp}`,
    `passwordResetOtp:     ${passwordResetOtp}`,
  ];

  // Eligibility — ALL must hold. Anything non-conforming is a skip reason.
  const reasons: string[] = [];
  if (hasPassword) reasons.push("hashedPassword is set (not a passwordless account)");
  if (!hasGoogleAccount) reasons.push("no linked Google account");
  if (purchases > 0) reasons.push(`has ${purchases} purchase(s)`);
  if (studentLibrary > 0) reasons.push(`has ${studentLibrary} studentLibrary row(s)`);
  if (readingProgress > 0) reasons.push(`has ${readingProgress} readingProgress row(s)`);
  if (textbooks > 0) reasons.push(`has ${textbooks} textbook(s)`);
  if (payouts > 0) reasons.push(`has ${payouts} payout(s)`);
  if (withdrawalRequests > 0) reasons.push(`has ${withdrawalRequests} withdrawalRequest(s)`);

  return { email, found: true, eligible: reasons.length === 0, reasons, id: u.id, summaryLines };
}

async function main() {
  console.log(`\n=== TARGETS (${TARGET_EMAILS.length}) ===`);

  const assessments: Assessment[] = [];
  for (const email of TARGET_EMAILS) {
    const a = await assess(email);
    assessments.push(a);

    console.log("\n" + "-".repeat(60));
    console.log(`EMAIL: ${email}`);
    if (!a.found) {
      console.log("  STATUS:      NOT FOUND");
      console.log("  RESULT:      SKIP — not found in DB");
      continue;
    }
    console.log("  STATUS:      FOUND");
    for (const line of a.summaryLines) console.log(`  ${line}`);
    if (a.eligible) {
      console.log("  ELIGIBILITY: ELIGIBLE");
      console.log("  RESULT:      WILL DELETE");
    } else {
      console.log("  ELIGIBILITY: NOT ELIGIBLE");
      console.log(`  RESULT:      SKIP — ${a.reasons.join("; ")}`);
    }
  }

  const toDelete = assessments.filter((a) => a.eligible);
  const skipped = assessments.filter((a) => !a.eligible);

  console.log("\n=== PLANNED CHANGES ===");
  if (toDelete.length === 0) {
    console.log("  No users eligible for deletion.");
  } else {
    console.log("  Would DELETE these user rows (cascades remove accounts / studentProfile / sessions / OTP):");
    for (const a of toDelete) console.log(`    - ${a.email}  (${a.id})`);
  }
  if (skipped.length > 0) {
    console.log("  Skipped:");
    for (const a of skipped) {
      console.log(`    - ${a.email}: ${a.found ? a.reasons.join("; ") : "not found"}`);
    }
  }

  if (!APPLY) {
    console.log("\nDRY RUN — no changes written. Re-run with CONFIRM_FREE_TEST_EMAILS=true to apply.\n");
    return;
  }

  if (toDelete.length === 0) {
    console.log("\nNothing eligible to delete.\n");
    return;
  }

  const deleted: { id: string; email: string }[] = [];
  for (const a of toDelete) {
    // Final guard: re-assess right before deleting so a row that gained data
    // (a purchase, a textbook, …) since the initial read is never deleted.
    const recheck = await assess(a.email);
    if (!recheck.found || !recheck.eligible || recheck.id !== a.id) {
      console.log(
        `SKIP (changed since read)  ${a.email} — ${recheck.found ? recheck.reasons.join("; ") : "not found"}`,
      );
      continue;
    }
    await db.user.delete({ where: { id: recheck.id! } });
    deleted.push({ id: recheck.id!, email: a.email });
  }

  console.log("\n=== APPLIED ===");
  console.table(deleted);
  console.log(`Deleted ${deleted.length} of ${toDelete.length} eligible user(s).\n`);
}

main()
  .catch((e) => {
    console.error("FREE-TEST-EMAILS ERROR:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
