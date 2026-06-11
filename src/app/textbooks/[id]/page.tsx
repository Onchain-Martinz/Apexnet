import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { routes } from "@/config/routes";

export default async function TextbookDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;

  const textbook = await db.textbook.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      fileKey: true, // existence check only — never rendered or linked directly
      lecturer: {
        select: { user: { select: { name: true } } },
      },
    },
  });

  if (!textbook) {
    notFound();
  }

  const priceLabel =
    Number(textbook.price) === 0
      ? "Free"
      : `₦${Number(textbook.price).toLocaleString("en-NG")}`;

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header className="space-y-1">
        <h1 className="text-title font-bold text-foreground">{textbook.title}</h1>
        <p className="text-[13px] text-muted-foreground">
          {textbook.lecturer.user.name ?? "Unknown lecturer"}
        </p>
        <p className="text-[15px] font-semibold text-foreground">{priceLabel}</p>
      </header>

      {textbook.description && (
        <p className="text-[14px] leading-relaxed text-foreground">
          {textbook.description}
        </p>
      )}

      <div className="space-y-element">
        {textbook.fileKey ? (
          <Link
            href={routes.textbookReader(textbook.id)}
            className="flex h-14 w-full items-center justify-center rounded-button bg-primary text-[15px] font-semibold text-primary-foreground transition-all duration-150 active:scale-[0.97]"
          >
            Read Textbook
          </Link>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            No file has been uploaded for this textbook yet.
          </p>
        )}
      </div>
    </div>
  );
}
