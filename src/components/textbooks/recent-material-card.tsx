import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { routes } from "@/config/routes";
import { coverUrl } from "@/lib/utils/cover-url";

export interface RecentMaterialData {
  id: string;
  title: string;
  price: number;
  isFree: boolean;
  coverImageKey: string | null;
  courseCode: string | null;
}

export function RecentMaterialCard({ textbook }: { textbook: RecentMaterialData }) {
  const cover = coverUrl(textbook.id, textbook.coverImageKey);

  return (
    <Link
      href={routes.textbook(textbook.id)}
      className="flex w-28 flex-shrink-0 flex-col gap-2.5 rounded-card border border-card-border bg-card p-3 shadow-card transition-all duration-150 active:scale-[0.97]"
    >
      <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md bg-muted shadow-sm">
        {cover ? (
          <Image
            src={cover}
            alt={textbook.title}
            width={104}
            height={139}
            sizes="104px"
            className="h-full w-full object-cover"
          />
        ) : (
          <BookOpen className="h-5 w-5 text-muted-foreground" aria-hidden />
        )}
      </div>
      <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-foreground">
        {textbook.title}
      </p>
    </Link>
  );
}
