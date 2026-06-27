"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading = false, disabled, children, ...props }, ref) => {
    const base = [
      "inline-flex items-center justify-center gap-2 font-semibold",
      "rounded-button",                           // 14px — Apex spec
      "transition-all duration-150",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      "disabled:pointer-events-none disabled:opacity-40",
      "select-none touch-target",
      "active:scale-[0.97]",
    ].join(" ");

    const variants = {
      primary: "bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-primary-foreground hover:shadow-glow",
      ghost:   "bg-transparent text-foreground hover:bg-muted",
      outline: "border border-white/10 bg-white/[0.05] text-foreground hover:bg-white/[0.08]",
    };

    const sizes = {
      sm: "h-10 px-4 text-[13px]",
      md: "h-12 px-5 text-[15px]",
      lg: "h-14 px-6 text-[15px]",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
