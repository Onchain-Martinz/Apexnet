/**
 * Narrow, manual repair for the 5 legacy PASSWORD accounts that were left
 * stuck with profileComplete = false by the earlier onboarding bug. These are
 * NOT genuine Google onboarding users (they have a password and no Google
 * account), so they should not remain "incomplete".
 *
 * It changes exactly ONE field and nothing else:
 *   users.profileComplete  false -> true
 *
 * It NEVER touches role, profiles, email, name, or password.
 *
 * Safety:
 *   • Only the 5 explicit emails below are ever considered — no broadening.
 *   • Per user it verifies the account is legacy/password before writing:
 *       hashedPassword !== null  AND  profileComplete === false  AND
 *       no linked Google account. Any user failing a check is SKIPPED, not
 *       written, with the reason printed.
 *   • DRY-RUN by default — prints the plan only. It writes ONLY when you run it
 *     with CONFIRM_PROFILE_COMPLETE_REPAIR=true.
 *   • The write itself re-asserts the legacy criteria in the WHERE clause, so a
 *     row that changed since the read (or a genuine OAuth user) can never be
 *     flipped.
 *
 * Dry-run:  npx ts-node --compiler-options {"module":"CommonJS"} scripts/repair-legacy-profile-complete.ts
 * Apply:    CONFIRM_PROFILE_COMPLETE_REPAIR=true npx ts-node --compiler-options {"module":"CommonJS"} scripts/repair-legacy-profile-complete.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// The exact, closed set of accounts this script may touch.
const TARGET_EMAILS = [
  "leolabarham1975@gmail.com",
  "nedunwokorie@gmail.com",
  "mrechodollaz@gmail.com",
  "martinzkizitto@gmail.com",
  "leonabraham1975@gmail.com",
];

const APPLY = process.env.CONFIRM_PROFILE_COMPLETE_REPAIR === "true";

async function main() {
  const users = await db.user.findMany({
    where: { email: { in: TARGET_EMAILS } },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      profileComplete: true,
      hashedPassword: true,
      accounts: { select: { provider: true } },
    },
  });

  const byEmail = new Map(users.map((u) => [u.email, u]));

  console.log(`\n=== TARGETS (${TARGET_EMAILS.length}) ===\n`);

  const eligibleIds: string[] = [];

  for (const email of TARGET_EMAILS) {
    const u = byEmail.get(email);
    if (!u) {
      console.log(`SKIP  ${email} — not found in DB`);
      continue;
    }

    const hasPassword = u.hashedPassword !== null;
    const hasGoogle = u.accounts.some((a) => a.provider === "google");

    const reasons: string[] = [];
    if (!hasPassword) reasons.push("no password (looks like an OAuth account)");
    if (u.profileComplete) reasons.push("already profileComplete = true");
    if (hasGoogle) reasons.push("has a linked Google account");

    const state = `[role=${u.role}, profileComplete=${u.profileComplete}, hasPassword=${hasPassword}, hasGoogle=${hasGoogle}]`;

    if (reasons.length > 0) {
      console.log(`SKIP  ${email} — ${reasons.join("; ")}  ${state}`);
      continue;
    }

    console.log(
      `OK    ${email} — ${state}  →  profileComplete: false -> true (role & everything else untouched)`,
    );
    eligibleIds.push(u.id);
  }

  console.log(`\nEligible for repair: ${eligibleIds.length} / ${TARGET_EMAILS.length}`);
  console.log("Change per eligible user: profileComplete false -> true. Nothing else is modified.");

  if (!APPLY) {
    console.log(
      "\nDRY RUN — no changes written. Re-run with CONFIRM_PROFILE_COMPLETE_REPAIR=true to apply.\n",
    );
    return;
  }

  if (eligibleIds.length === 0) {
    console.log("\nNothing eligible to write.\n");
    return;
  }

  // Re-assert the legacy criteria in the WHERE so only password + still-incomplete
  // rows are written, even if state changed between read and write.
  const result = await db.user.updateMany({
    where: {
      id: { in: eligibleIds },
      hashedPassword: { not: null },
      profileComplete: false,
    },
    data: { profileComplete: true },
  });

  const after = await db.user.findMany({
    where: { id: { in: eligibleIds } },
    select: { email: true, role: true, profileComplete: true },
  });

  console.log("\n=== APPLIED ===");
  console.log(`Rows updated: ${result.count}`);
  console.table(after);
  console.log("");
}

main()
  .catch((e) => {
    console.error("REPAIR ERROR:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
