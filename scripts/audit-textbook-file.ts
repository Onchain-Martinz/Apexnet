import { PrismaClient } from "@prisma/client";
import { existsSync } from "fs";
import { join } from "path";

const TITLE = "Introduction to psychobiology";
const db = new PrismaClient();

async function main() {
  const textbooks = await db.textbook.findMany({
    where: { title: { equals: TITLE, mode: "insensitive" } },
  });

  if (textbooks.length === 0) {
    console.error(`No textbook found with title: ${TITLE}`);
    process.exit(1);
  }

  for (const tb of textbooks) {
    console.log("\n=== Textbook record ===");
    console.log(JSON.stringify(tb, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));

    const fileKey = tb.fileKey;
    console.log(`\nfileKey (DB value): ${fileKey}`);

    if (fileKey) {
      // fileKey is stored like "/uploads/<uuid>.pdf"
      const relativePath = fileKey.replace(/^\//, "");
      const fsPath = join(process.cwd(), "public", relativePath);
      const exists = existsSync(fsPath);
      console.log(`Filesystem path: ${fsPath}`);
      console.log(`File exists: ${exists}`);
    } else {
      console.log("No fileKey set on this record.");
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
