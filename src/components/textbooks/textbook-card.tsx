import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { routes } from "@/config/routes";

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
  return `₦${price.toLocaleString("en-NG")}`;
}

function coverUrl(key: string | null): string | null {
  if (!key) return null;
  const base = process.env.R2_PUBLIC_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}

// ── Vertical card — used on Discover and Student Home ───────────────────────

export function TextbookCard({ textbook }: { textbook: TextbookCardData }) {
  const cover = coverUrl(textbook.coverImageKey);
  const meta = [textbook.department?.name, textbook.level ? `${textbook.level} Level` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={routes.textbook(textbook.id)}
      className="flex flex-col overflow-hidden rounded-card border border-card-border bg-card shadow-card transition-all duration-150 active:scale-[0.97]"
    >
      <div className="flex aspect-[3/4] w-full items-center justify-center bg-muted">
        {cover ? (
          <Image
            src={cover}
            alt={textbook.title}
            width={240}
            height={320}
            className="h-full w-full object-cover"
          />
        ) : (
          <BookOpen className="h-8 w-8 text-muted-foreground" aria-hidden />
        )}
      </div>

      <div className="space-y-1 p-3">
        <p className="line-clamp-2 text-[14px] font-semibold leading-tight text-foreground">
          {textbook.title}
        </p>
        <p className="truncate text-[12px] text-muted-foreground">
          {textbook.lecturer.user.name ?? "Unknown lecturer"}
        </p>
        {meta && (
          <p className="truncate text-[12px] text-muted-foreground">{meta}</p>
        )}
        <p className="text-[13px] font-semibold text-foreground">
          {priceLabel(textbook.price, textbook.isFree)}
        </p>
      </div>
    </Link>
  );
}

// ── Horizontal row — used in "Recently Added" lists ──────────────────────────

export function TextbookRow({ textbook }: { textbook: TextbookCardData }) {
  const cover = coverUrl(textbook.coverImageKey);
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
