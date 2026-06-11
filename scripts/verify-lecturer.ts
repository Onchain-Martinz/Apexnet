import { PrismaClient } from "@prisma/client";

const EMAIL = "iwualakizitto@gmail.com";
const db = new PrismaClient();

async function main() {
  const user = await db.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, lecturerProfile: { select: { id: true } } },
  });

  if (!user) {
    console.error(`No user found with email: ${EMAIL}`);
    process.exit(1);
  }

  if (!user.lecturerProfile) {
    console.error(`User ${EMAIL} has no LecturerProfile`);
    process.exit(1);
  }

  const updated = await db.lecturerProfile.update({
    where: { userId: user.id },
    data: { verified: true, verifiedAt: new Date() },
    select: {
      id: true,
      userId: true,
      verified: true,
      verifiedAt: true,
      user: { select: { email: true, name: true } },
    },
  });

  console.log("\nUpdated LecturerProfile:");
  console.log(JSON.stringify(updated, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
