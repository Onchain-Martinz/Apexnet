import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { routes } from "@/config/routes";
import { coverUrl } from "@/lib/utils/cover-url";
import { BuyButton } from "@/components/textbooks/buy-button";
import { ApexSeal, VerifiedLecturerBadge } from "@/components/ui/verification-badge";

// Forces this route to be fully dynamic (no static/ISR caching). Needed for
// notFound() to reliably commit an actual 404 status code rather than
// rendering the not-found UI under a 200 — observed in this app whenever
// notFound() was reached after an additional async DB call rather than as
// the page's very first statement.
export const dynamic = "force-dynamic";

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
      status: true,
      fileKey: true, // existence check only — never rendered or linked directly
      coverImageKey: true,
      lecturer: {
        select: { userId: true, verified: true, user: { select: { name: true } } },
      },
      department: { select: { name: true } },
    },
  });

  if (!textbook) {
    notFound();
  }

  const isOwner = textbook.lecturer.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const isFree = textbook.isFree || Number(textbook.price) === 0;
  const coverSrc = coverUrl(textbook.id, textbook.coverImageKey);

  const owned = !isOwner
    ? await db.studentLibrary.findUnique({
        where: { studentId_textbookId: { studentId: session.user.id, textbookId: textbook.id } },
        select: { id: true },
      })
    : null;

  // Hidden (ARCHIVED) and DRAFT textbooks are only visible to their owning
  // lecturer, admins (for moderation), and students who already own them —
  // so existing purchases/access never break when a textbook is hidden.
  // Everyone else gets a clean 404, not a page that still shows the content
  // minus a buy button (that was BUG #1 — the page rendered fully regardless
  // of status, only the CTA was gated).
  if (!isOwner && !isAdmin && !owned && textbook.status !== "PUBLISHED") {
    notFound();
  }

  const priceLabel = isFree
    ? "Free"
    : `₦${Number(textbook.price).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

  const meta = [textbook.department?.name, textbook.level ? `${textbook.level} Level` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">

      {/* Cover image */}
      <div className="flex justify-center">
        <div className="flex h-[210px] w-[140px] flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted shadow-[0_4px_24px_rgba(0,0,0,0.10)]">
          {coverSrc ? (
            <Image
              src={coverSrc}
              alt={textbook.title}
              width={140}
              height={210}
              className="h-full w-full object-cover"
              priority
            />
          ) : (
            <BookOpen className="h-10 w-10 text-muted-foreground" aria-hidden />
          )}
        </div>
      </div>

      <header className="space-y-1">
        <h1 className="text-title font-bold text-foreground">{textbook.title}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[13px] text-muted-foreground">
            {textbook.lecturer.user.name ?? "Unknown lecturer"}
          </p>
          {textbook.lecturer.verified && <ApexSeal size={14} />}
        </div>
        {textbook.lecturer.verified && <VerifiedLecturerBadge />}
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
        {/* The page-level gate above already gets a non-owner/non-admin/
            non-owning viewer a 404 whenever the textbook isn't PUBLISHED,
            so by this point the viewer is always entitled to be here. */}
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
