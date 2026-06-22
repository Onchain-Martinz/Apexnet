import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { MaterialStatus } from "@/lib/textbooks/semester-materials";

const STATUS_STYLES: Record<MaterialStatus, string> = {
  owned: "bg-success/10 text-success",
  available: "bg-primary/10 text-primary",
  not_published: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<MaterialStatus, string> = {
  owned: "Owned",
  available: "Available",
  not_published: "Coming Soon",
};

export function MaterialStatusBadge({
  status,
  className,
}: {
  status: MaterialStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
        STATUS_STYLES[status],
        className,
      )}
    >
      {status === "owned" && <Check className="h-2.5 w-2.5" aria-hidden />}
      {STATUS_LABEL[status]}
    </span>
  );
}
