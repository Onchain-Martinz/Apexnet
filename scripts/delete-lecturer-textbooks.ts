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

  const lecturerId = user.lecturerProfile.id;

  const { count } = await db.textbook.deleteMany({
    where: { lecturerId },
  });

  const remaining = await db.textbook.count({ where: { lecturerId } });

  console.log(JSON.stringify({ deleted: count, lecturerId, remaining }, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
