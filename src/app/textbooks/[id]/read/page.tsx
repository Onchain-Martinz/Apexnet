import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { routes } from "@/config/routes";
import { ReaderView } from "@/components/textbooks/reader-view";
import { checkTextbookAccess, grantFreeLibraryAccess } from "@/lib/textbooks/access";

export default async function TextbookReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const textbook = await db.textbook.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      fileKey: true,
      status: true,
      isFree: true,
      price: true,
      lecturer: { select: { userId: true } },
    },
  });

  if (!textbook || !textbook.fileKey) {
    notFound();
  }

  const access = await checkTextbookAccess(textbook, session.user.id, session.user.role);
  if (!access.allowed) {
    notFound();
  }

  if (access.isFree && !access.isOwner) {
    await grantFreeLibraryAccess(textbook.id, session.user.id);
  }

  const progress = await db.readingProgress.findUnique({
    where: {
      studentId_textbookId: {
        studentId: session.user.id,
        textbookId: textbook.id,
      },
    },
    select: { currentPage: true, totalPages: true },
  });

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-border px-page py-3">
        <Link
          href={routes.textbook(textbook.id)}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full hover:bg-muted transition-colors"
          aria-label="Back to textbook details"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" aria-hidden />
        </Link>
        <h1 className="truncate text-[15px] font-semibold text-foreground">
          {textbook.title}
        </h1>
      </header>

      <div className="flex-1 overflow-hidden">
        <ReaderView
          textbookId={textbook.id}
          fileUrl={`/api/books/${textbook.id}/file`}
          initialPage={progress?.currentPage && progress.currentPage > 0 ? progress.currentPage : 1}
          initialTotalPages={progress?.totalPages ?? null}
        />
      </div>
    </div>
  );
}
