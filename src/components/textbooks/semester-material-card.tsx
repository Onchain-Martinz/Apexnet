import Image from "next/image";
import Link from "next/link";
import { BookOpen, Folder } from "lucide-react";
import { routes } from "@/config/routes";
import { coverUrl } from "@/lib/utils/cover-url";
import type { MaterialStatus } from "@/lib/textbooks/semester-materials";
import { MaterialStatusBadge } from "@/components/textbooks/material-status-badge";

export interface CourseMaterialTextbook {
  id: string;
  price: number;
  isFree: boolean;
  coverImageKey: string | null;
}

// A tile represents a course, not a textbook — `textbook` is null when no
// lecturer has linked one to this course yet ("Coming Soon" folder state).
// Finder/iCloud Drive icon-grid feel: no card chrome, the icon/cover is the
// anchor and everything else stacks underneath it with spacing only.
export function SemesterMaterialCard({
  code,
  title,
  textbook,
  status,
}: {
  code: string;
  title: string;
  textbook: CourseMaterialTextbook | null;
  status: MaterialStatus;
}) {
  const cover = textbook ? coverUrl(textbook.id, textbook.coverImageKey) : null;
  const isFree = Boolean(textbook && (textbook.isFree || textbook.price === 0));

  const visual = textbook ? (
    cover ? (
      <Image
        src={cover}
        alt={title}
        width={72}
        height={96}
        sizes="72px"
        className="h-24 w-[72px] rounded-md object-cover shadow-md"
      />
    ) : (
      <BookOpen className="h-20 w-20 text-muted-foreground drop-shadow-sm" aria-hidden />
    )
  ) : (
    <Folder className="h-20 w-20 fill-foreground text-foreground drop-shadow-md" aria-hidden />
  );

  const inner = (
    <div className="flex flex-col items-center gap-2 text-center">
      {visual}
      <p className="mt-2.5 max-w-full truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {code}
      </p>
      <p className="line-clamp-2 min-h-[36px] px-1 text-[13px] font-bold leading-snug text-foreground">
        {title}
      </p>
      <div className="mt-1">
        <MaterialStatusBadge status={status} />
      </div>
      <div className="mt-2">
        {status === "not_published" ? (
          <p className="text-[10px] text-muted-foreground">Not yet available</p>
        ) : (
          <span className="inline-flex rounded-button bg-primary px-3.5 py-1.5 text-[12px] font-semibold text-primary-foreground">
            {status === "owned" ? "Open Textbook" : isFree ? "Free" : "Buy Now"}
          </span>
        )}
      </div>
    </div>
  );

  // No linked textbook yet — no link, no purchase action.
  if (!textbook || status === "not_published") {
    return <div className="flex flex-col items-center py-3 opacity-70">{inner}</div>;
  }

  return (
    <Link
      href={routes.textbook(textbook.id)}
      className="flex flex-col items-center py-3 transition-transform duration-150 active:scale-[0.96]"
    >
      {inner}
    </Link>
  );
}
