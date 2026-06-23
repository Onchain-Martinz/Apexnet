import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { routes } from "@/config/routes";
import { coverUrl } from "@/lib/utils/cover-url";

export interface TextbookCardData {
  id: string;
  title: string;
  price: number;
  isFree: boolean;
  coverImageKey: string | null;
  level: number | null;
  courseCode: string | null;
  lecturer: { user: { name: string | null } };
  department: { name: string } | null;
}

function priceLabel(price: number, isFree: boolean): string {
  if (isFree || price === 0) return "Free";
  return `₦${price.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

// ── Flat Finder-style item — used on Discover, Student Home, Marketing ──────
// No card chrome. Mirrors SemesterMaterialCard's hierarchy (cover → code →
// title → price badge → lecturer caption) so every book grid in Apexnet
// reads as one consistent browsing language.

export function TextbookCard({ textbook }: { textbook: TextbookCardData }) {
  const cover = coverUrl(textbook.id, textbook.coverImageKey);
  const isFree = textbook.isFree || textbook.price === 0;

  return (
    <Link
      href={routes.textbook(textbook.id)}
      className="flex flex-col items-center gap-2 py-3 text-center transition-transform duration-150 active:scale-[0.97]"
    >
      <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md bg-muted shadow-md">
        {cover ? (
          <Image
            src={cover}
            alt={textbook.title}
            width={240}
            height={320}
            sizes="(min-width: 1280px) 18vw, (min-width: 768px) 22vw, 40vw"
            className="h-full w-full object-cover"
          />
        ) : (
          <BookOpen className="h-8 w-8 text-muted-foreground" aria-hidden />
        )}
      </div>

      {textbook.courseCode && (
        <p className="mt-2.5 max-w-full truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {textbook.courseCode}
        </p>
      )}
      <p className="line-clamp-2 min-h-[36px] px-1 text-[13px] font-bold leading-snug text-foreground">
        {textbook.title}
      </p>

      <span
        className={
          isFree
            ? "inline-flex items-center rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-success"
            : "inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-primary"
        }
      >
        {priceLabel(textbook.price, textbook.isFree)}
      </span>

      <p className="mt-1 truncate text-[11px] text-muted-foreground">
        {textbook.lecturer.user.name ?? "Unknown lecturer"}
      </p>
    </Link>
  );
}

// ── Horizontal row — used in "Recently Added" lists ──────────────────────────

export function TextbookRow({ textbook }: { textbook: TextbookCardData }) {
  const cover = coverUrl(textbook.id, textbook.coverImageKey);
  const meta = [textbook.department?.name, textbook.level ? `${textbook.level} Level` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={routes.textbook(textbook.id)}
      className="flex items-center gap-4 rounded-card border border-card-border bg-card p-card shadow-card transition-all duration-150 active:scale-[0.97]"
    >
      <div className="flex h-16 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {cover ? (
          <Image src={cover} alt={textbook.title} width={48} height={64} className="h-full w-full object-cover" />
        ) : (
          <BookOpen className="h-6 w-6 text-muted-foreground" aria-hidden />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-[15px] font-semibold text-foreground">{textbook.title}</p>
        <p className="truncate text-[13px] text-muted-foreground">
          {textbook.lecturer.user.name ?? "Unknown lecturer"}
        </p>
        {meta && <p className="truncate text-[12px] text-muted-foreground">{meta}</p>}
      </div>

      <p className="flex-shrink-0 text-[13px] font-semibold text-foreground">
        {priceLabel(textbook.price, textbook.isFree)}
      </p>
    </Link>
  );
}
