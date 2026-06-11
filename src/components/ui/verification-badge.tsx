import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface VerificationBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZES: Record<NonNullable<VerificationBadgeProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const ICON_SIZES: Record<NonNullable<VerificationBadgeProps["size"]>, string> = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-3.5 w-3.5",
};

/**
 * Solid gold verification badge with a white checkmark, displayed beside a
 * verified lecturer's name. Usage: <VerificationBadge /> inline after the name element.
 */
export function VerificationBadge({ className, size = "md" }: VerificationBadgeProps) {
  return (
    <span
      aria-label="Verified lecturer"
      title="Verified lecturer"
      className={cn(
        "inline-flex flex-shrink-0 items-center justify-center rounded-full bg-amber-500 shadow-sm",
        SIZES[size],
        className,
      )}
    >
      <Check className={cn("text-white", ICON_SIZES[size])} strokeWidth={3} aria-hidden />
    </span>
  );
}
