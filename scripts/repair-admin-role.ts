/**
 * Narrow, manual repair for the admin account that the onboarding bug rewrote
 * from ADMIN to LECTURER (smileydbandit22@gmail.com).
 *
 * It restores exactly three things and nothing else:
 *   1. users.role            → ADMIN
 *   2. users.profileComplete → true   (admins are always complete)
 *   3. deletes the wrongly-created lecturerProfile for that user (if present)
 *
 * It NEVER touches email, hashedPassword, name, or emailVerifiedAt.
 *
 * Safety: DRY-RUN by default — it only prints the plan. It writes ONLY when you
 * run it with CONFIRM_ADMIN_REPAIR=true. It also refuses to delete the
 * lecturerProfile if that profile has dependent rows (textbooks / payouts /
 * withdrawals), so no unrelated data can be lost — it reports instead.
 *
 * Dry-run:  npx ts-node --compiler-options {"module":"CommonJS"} scripts/repair-admin-role.ts
 * Apply:    CONFIRM_ADMIN_REPAIR=true npx ts-node --compiler-options {"module":"CommonJS"} scripts/repair-admin-role.ts
 */
import { PrismaClient, Role } from "@prisma/client";

const db = new PrismaClient();

const TARGET_EMAIL = "smileydbandit22@gmail.com";
const APPLY = process.env.CONFIRM_ADMIN_REPAIR === "true";

async function main() {
  const user = await db.user.findFirst({
    where: { email: { equals: TARGET_EMAIL, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      profileComplete: true,
      hashedPassword: true,
      lecturerProfile: { select: { id: true } },
      studentProfile: { select: { id: true } },
    },
  });

  if (!user) {
    console.error(`No user found for ${TARGET_EMAIL}. Nothing to repair.`);
    process.exit(1);
  }

  console.log("\n=== CURRENT STATE ===");
  console.log({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    profileComplete: user.profileComplete,
    hasPassword: user.hashedPassword !== null,
    lecturerProfileId: user.lecturerProfile?.id ?? null,
    studentProfileId: user.studentProfile?.id ?? null,
  });

  // Check the lecturerProfile for dependents before proposing deletion.
  let lecturerProfileDeletable = false;
  let dependents = { textbooks: 0, payouts: 0, withdrawalRequests: 0 };
  if (user.lecturerProfile) {
    const [textbooks, payouts, withdrawalRequests] = await Promise.all([
      db.textbook.count({ where: { lecturerId: user.lecturerProfile.id } }),
      db.payout.count({ where: { lecturerId: user.lecturerProfile.id } }),
      db.withdrawalRequest.count({ where: { lecturerId: user.lecturerProfile.id } }),
    ]);
    dependents = { textbooks, payouts, withdrawalRequests };
    lecturerProfileDeletable = textbooks === 0 && payouts === 0 && withdrawalRequests === 0;
  }

  console.log("\n=== PLANNED CHANGES ===");
  console.log(`role:            ${user.role} -> ADMIN`);
  console.log(`profileComplete: ${user.profileComplete} -> true`);
  if (user.lecturerProfile) {
    console.log(
      `lecturerProfile: delete ${user.lecturerProfile.id} ` +
        `(dependents: ${JSON.stringify(dependents)})` +
        (lecturerProfileDeletable ? "" : "  ⚠ HAS DEPENDENTS — will NOT delete"),
    );
  } else {
    console.log("lecturerProfile: none (nothing to delete)");
  }
  console.log("Untouched: email, hashedPassword, name, emailVerifiedAt");

  if (!APPLY) {
    console.log(
      "\nDRY RUN — no changes written. Re-run with CONFIRM_ADMIN_REPAIR=true to apply.\n",
    );
    return;
  }

  if (user.lecturerProfile && !lecturerProfileDeletable) {
    console.error(
      "\nABORTING WRITE: the lecturerProfile has dependent rows. Resolve those " +
        "manually before repair so nothing is lost. User role/profileComplete " +
        "were NOT changed.\n",
    );
    process.exit(1);
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { role: Role.ADMIN, profileComplete: true },
    });
    if (user.lecturerProfile) {
      await tx.lecturerProfile.delete({ where: { id: user.lecturerProfile.id } });
    }
  });

  const after = await db.user.findUnique({
    where: { id: user.id },
    select: {
      role: true,
      profileComplete: true,
      lecturerProfile: { select: { id: true } },
    },
  });

  console.log("\n=== APPLIED. NEW STATE ===");
  console.log({
    role: after?.role,
    profileComplete: after?.profileComplete,
    lecturerProfileId: after?.lecturerProfile?.id ?? null,
  });
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
