import { cn } from "@/lib/utils/cn";

interface ProgressBarProps {
  percentage: number;
  className?: string;
}

// Minimal reading-progress indicator — slate track, slate-900 fill.
export function ProgressBar({ percentage, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percentage));

  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-200", className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-slate-900 transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
