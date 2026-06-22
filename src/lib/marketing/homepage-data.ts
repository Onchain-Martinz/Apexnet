import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

const TTL = 86_400; // 24 hours in seconds

// All five homepage DB queries run together in a single cached call.
// The cache is shared across every concurrent request, so the connection
// pool sees at most one DB round-trip per 24-hour window regardless of traffic.
// Tag "homepage" allows on-demand invalidation via revalidateTag("homepage")
// — useful in the future when a lecturer publishes a new textbook.

export const getHomepageData = unstable_cache(
  async () => {
    const [publishedCount, lecturerCount, studentCount, purchaseCount, textbooks] =
      await Promise.all([
        db.textbook.count({ where: { status: "PUBLISHED" } }),
        db.user.count({ where: { role: "LECTURER" } }),
        db.user.count({ where: { role: "STUDENT" } }),
        db.purchase.count({ where: { status: "COMPLETED" } }),
        db.textbook.findMany({
          where: { status: "PUBLISHED" },
          orderBy: { publishedAt: "desc" },
          take: 6,
          select: {
            id: true,
            title: true,
            price: true,
            isFree: true,
            coverImageKey: true,
            level: true,
            courseCode: true,
            lecturer: { select: { user: { select: { name: true } } } },
            department: { select: { name: true } },
          },
        }),
      ]);

    return {
      publishedCount,
      lecturerCount,
      studentCount,
      purchaseCount,
      // Convert Decimal → number before the cache boundary. The serialized
      // cache entry is JSON, which cannot represent Prisma Decimal objects.
      marketplaceTextbooks: textbooks.map((t) => ({ ...t, price: Number(t.price) })),
    };
  },
  ["homepage-data"],
  { revalidate: TTL, tags: ["homepage"] },
);
