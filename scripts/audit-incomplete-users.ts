/**
 * READ-ONLY audit of every user with profileComplete = false.
 *
 * Purpose: after the onboarding/admin-corruption bug, decide which incomplete
 * rows are legitimate new Google onboarding users vs. legacy accounts whose
 * profileComplete was wrongly left false and need repair.
 *
 * This script performs NO writes. Only findMany/count.
 *
 * Run:  npx ts-node --compiler-options {"module":"CommonJS"} scripts/audit-incomplete-users.ts
 *
 * How to read the output:
 *   - hasPassword = true  → credentials/legacy account. Should almost always be
 *     profileComplete = true; if false here it is a legacy row to repair, NOT a
 *     real onboarding user. (Admins fall in this bucket.)
 *   - hasPassword = false + hasGoogleAccount = true → genuine Google onboarding
 *     user; leaving profileComplete = false is correct until they finish.
 *   - role = ADMIN anywhere in this list = a bug/corruption to fix.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const incomplete = await db.user.findMany({
    where: { profileComplete: false },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      role: true,
      hashedPassword: true,
      createdAt: true,
      accounts: { select: { provider: true } },
      studentProfile: { select: { id: true } },
      lecturerProfile: { select: { id: true } },
    },
  });

  const rows = incomplete.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    hasPassword: u.hashedPassword !== null,
    hasGoogleAccount: u.accounts.some((a) => a.provider === "google"),
    hasStudentProfile: u.studentProfile !== null,
    hasLecturerProfile: u.lecturerProfile !== null,
    createdAt: u.createdAt.toISOString(),
  }));

  console.log(`\nprofileComplete = false users: ${rows.length}\n`);
  console.table(rows);

  const legacy = rows.filter((r) => r.hasPassword || r.role === "ADMIN");
  const genuine = rows.filter((r) => !r.hasPassword && r.role !== "ADMIN");
  console.log(
    `\nLikely LEGACY rows to repair (hasPassword or ADMIN): ${legacy.length}`,
  );
  console.log(`Likely GENUINE onboarding users (passwordless, non-admin): ${genuine.length}`);
  const adminCount = await db.user.count({ where: { role: "ADMIN" } });
  console.log(`\nTotal ADMIN users in DB right now: ${adminCount}`);
}

main()
  .catch((e) => {
    console.error("AUDIT ERROR:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
