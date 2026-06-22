import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { routes } from "@/config/routes";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";
import { coverUrl } from "@/lib/utils/cover-url";

interface LibraryProgress {
  currentPage: number;
  totalPages: number | null;
  percentage: number;
  lastReadAt: Date;
}

interface LibraryBookCardProps {
  textbook: {
    id: string;
    title: string;
    coverImageKey: string | null;
  };
  progress: LibraryProgress | null;
}

export function LibraryBookCard({ textbook, progress }: LibraryBookCardProps) {
  const cover = coverUrl(textbook.id, textbook.coverImageKey);
  const percentage = progress ? Math.round(progress.percentage) : 0;
  const hasProgress = progress !== null && progress.totalPages !== null;

  return (
    <div className="flex gap-3 rounded-card border border-card-border bg-card p-card shadow-card">
      <div className="flex h-24 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {cover ? (
          <Image src={cover} alt={textbook.title} width={64} height={96} className="h-full w-full object-cover" />
        ) : (
          <BookOpen className="h-6 w-6 text-muted-foreground" aria-hidden />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="line-clamp-2 text-[14px] font-semibold leading-tight text-foreground">
          {textbook.title}
        </p>

        {hasProgress ? (
          <div className="space-y-1.5">
            <p className="text-[12px] text-muted-foreground">
              Page {progress!.currentPage} of {progress!.totalPages}
            </p>
            <ProgressBar percentage={percentage} />
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-foreground">{percentage}% Complete</p>
              <p className="text-[12px] text-muted-foreground">
                Last opened {formatRelativeTime(progress!.lastReadAt)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">Not started yet</p>
        )}

        <Link
          href={routes.textbookReader(textbook.id)}
          className="mt-auto flex h-9 w-full items-center justify-center rounded-button bg-primary text-[13px] font-semibold text-primary-foreground transition-all duration-150 active:scale-[0.97]"
        >
          Continue Reading
        </Link>
      </div>
    </div>
  );
}
