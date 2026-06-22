import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getLecturerProfile } from "@/lib/data/lecturer";
import { LECTURER_SHARE_RATE } from "@/lib/constants";
import { roundCurrency } from "@/lib/utils/format";
import { textbookCardSelect } from "@/lib/textbooks/discover";
import { BooksPageClient } from "@/components/lecturer/books-page-client";
import type { BookItem } from "@/components/lecturer/books-page-client";
import type { TextbookCardData } from "@/components/textbooks/textbook-card";

export default async function LecturerBooksPage() {
  const session = await requireRole("LECTURER");

  const lecturerProfile = await getLecturerProfile(session.user.id);

  const [textbooksRaw, dLibraryRaw] = await Promise.all([
    lecturerProfile
      ? db.textbook.findMany({
          where: { lecturerId: lecturerProfile.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            coverImageKey: true,
            purchases: {
              where: { status: "COMPLETED" },
              orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
              take: 100,
              select: {
                amount: true,
                paidAt: true,
                createdAt: true,
                student: { select: { name: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    db.textbook.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: textbookCardSelect,
    }),
  ]);

  const books: BookItem[] = textbooksRaw.map((book) => {
    const sales = book.purchases.map((p) => ({
      studentName: p.student.name,
      amount: roundCurrency(Number(p.amount) * LECTURER_SHARE_RATE),
      paidAt: (p.paidAt ?? p.createdAt).toISOString(),
    }));

    const totalRevenue = roundCurrency(
      book.purchases.reduce((sum, p) => sum + Number(p.amount), 0) * LECTURER_SHARE_RATE,
    );

    const lastSaleAt =
      book.purchases.length > 0
        ? (book.purchases[0].paidAt ?? book.purchases[0].createdAt).toISOString()
        : null;

    return {
      id: book.id,
      title: book.title,
      price: Number(book.price),
      status: book.status,
      coverImageKey: book.coverImageKey,
      metrics: {
        totalRevenue,
        salesCount: book.purchases.length,
        lastSaleAt,
        sales,
      },
    };
  });

  const dLibraryBooks: TextbookCardData[] = dLibraryRaw.map((book) => ({
    ...book,
    price: Number(book.price),
  }));

  return <BooksPageClient books={books} dLibraryBooks={dLibraryBooks} />;
}
