import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { routes } from "@/config/routes";
import { BuyButton } from "@/components/textbooks/buy-button";

export default async function TextbookDetailsPage({
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
      description: true,
      price: true,
      isFree: true,
      level: true,
      fileKey: true, // existence check only — never rendered or linked directly
      lecturer: {
        select: { userId: true, user: { select: { name: true } } },
      },
      department: { select: { name: true } },
    },
  });

  if (!textbook) {
    notFound();
  }

  const isOwner = textbook.lecturer.userId === session.user.id;
  const isFree = textbook.isFree || Number(textbook.price) === 0;

  const owned =
    !isFree && !isOwner
      ? await db.studentLibrary.findUnique({
          where: { studentId_textbookId: { studentId: session.user.id, textbookId: textbook.id } },
          select: { id: true },
        })
      : null;
  const priceLabel = isFree
    ? "Free"
    : `₦${Number(textbook.price).toLocaleString("en-NG")}`;

  const meta = [textbook.department?.name, textbook.level ? `${textbook.level} Level` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header className="space-y-1">
        <h1 className="text-title font-bold text-foreground">{textbook.title}</h1>
        <p className="text-[13px] text-muted-foreground">
          {textbook.lecturer.user.name ?? "Unknown lecturer"}
        </p>
        {meta && <p className="text-[13px] text-muted-foreground">{meta}</p>}
        <div className="flex items-center gap-2 pt-1">
          <p className="text-[15px] font-semibold text-foreground">{priceLabel}</p>
          {textbook.fileKey && (
            <span className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold leading-none text-success">
              Preview Available
            </span>
          )}
        </div>
      </header>

      {textbook.description && (
        <p className="text-[14px] leading-relaxed text-foreground">
          {textbook.description}
        </p>
      )}

      <div className="space-y-element">
        {!textbook.fileKey ? (
          <p className="text-[13px] text-muted-foreground">
            No file has been uploaded for this textbook yet.
          </p>
        ) : isOwner || isFree || owned ? (
          <Link
            href={routes.textbookReader(textbook.id)}
            className="flex h-14 w-full items-center justify-center rounded-button bg-primary text-[15px] font-semibold text-primary-foreground transition-all duration-150 active:scale-[0.97]"
          >
            Read Textbook
          </Link>
        ) : session.user.role === "STUDENT" ? (
          <BuyButton textbookId={textbook.id} />
        ) : null}
      </div>
    </div>
  );
}
