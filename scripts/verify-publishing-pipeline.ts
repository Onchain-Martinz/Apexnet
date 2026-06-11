import { PrismaClient } from "@prisma/client";

const EMAIL = "iwualakizitto@gmail.com";
const db = new PrismaClient();

async function main() {
  const user = await db.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, lecturerProfile: { select: { id: true, verified: true } } },
  });

  if (!user?.lecturerProfile) {
    console.error("No lecturer profile found");
    process.exit(1);
  }

  const lecturerId = user.lecturerProfile.id;
  const isVerified = user.lecturerProfile.verified;
  console.log(`Lecturer verified: ${isVerified}`);

  // 1. Simulate POST /api/books — create textbook, status depends on verified
  const created = await db.textbook.create({
    data: {
      title: "Pipeline Test Book",
      description: "End-to-end pipeline verification",
      level: 100,
      price: 0,
      isFree: true,
      fileKey: "/uploads/test-pipeline.pdf",
      lecturerId,
      status: isVerified ? "PUBLISHED" : "DRAFT",
      publishedAt: isVerified ? new Date() : null,
    },
    select: { id: true, status: true },
  });
  console.log("Created textbook:", created);

  // 2. Confirm it appears in lecturer's "My Books" query
  const lecturerBooks = await db.textbook.findMany({
    where: { lecturerId },
    select: { id: true, title: true, status: true },
  });
  const foundInLecturer = lecturerBooks.some((b) => b.id === created.id);
  console.log(`Appears in lecturer dashboard query: ${foundInLecturer}`);

  // 3. Simulate PATCH /api/books/[id]/publish (only if it was DRAFT)
  if (created.status === "DRAFT") {
    const published = await db.textbook.update({
      where: { id: created.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
      select: { id: true, status: true, publishedAt: true },
    });
    console.log("Published textbook:", published);
  }

  // 4. Confirm it appears in student library query (status = PUBLISHED)
  const studentLibrary = await db.textbook.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true },
  });
  const foundInLibrary = studentLibrary.some((b) => b.id === created.id);
  console.log(`Appears in student library query: ${foundInLibrary}`);

  // 5. Cleanup test record
  await db.textbook.delete({ where: { id: created.id } });
  console.log("Cleaned up test textbook.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
