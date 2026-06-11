import { PrismaClient } from "@prisma/client";

const EMAIL = "iwualakizitto@gmail.com";
const db = new PrismaClient();

async function main() {
  const user = await db.user.findUnique({
    where: { email: EMAIL },
  });

  if (!user) {
    console.error(`No user found with email: ${EMAIL}`);
    process.exit(1);
  }

  console.log("\n=== User record ===");
  console.log(JSON.stringify(user, null, 2));

  const lecturerProfile = await db.lecturerProfile.findUnique({
    where: { userId: user.id },
  });

  console.log("\n=== LecturerProfile record ===");
  console.log(JSON.stringify(lecturerProfile, null, 2));

  if (lecturerProfile) {
    const textbookCount = await db.textbook.count({
      where: { lecturerId: lecturerProfile.id },
    });
    console.log(`\n=== Textbook count: ${textbookCount} ===`);

    const textbooks = await db.textbook.findMany({
      where: { lecturerId: lecturerProfile.id },
      select: { id: true, title: true, status: true, createdAt: true },
    });
    console.log(JSON.stringify(textbooks, null, 2));

    const payoutCount = await db.payout.count({
      where: { lecturerId: lecturerProfile.id },
    });
    console.log(`\n=== Payout count: ${payoutCount} ===`);
  }

  const accounts = await db.account.findMany({ where: { userId: user.id } });
  console.log(`\n=== Accounts (NextAuth OAuth): ${accounts.length} ===`);
  console.log(JSON.stringify(accounts, null, 2));

  const sessions = await db.session.findMany({ where: { userId: user.id } });
  console.log(`\n=== Sessions: ${sessions.length} ===`);
  console.log(JSON.stringify(sessions, null, 2));

  const purchases = await db.purchase.count({ where: { studentId: user.id } });
  const library = await db.studentLibrary.count({ where: { studentId: user.id } });
  const readingProgress = await db.readingProgress.count({ where: { studentId: user.id } });
  console.log(`\n=== Other relations on User ===`);
  console.log({ purchases, library, readingProgress });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
