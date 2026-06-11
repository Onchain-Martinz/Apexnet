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
      primary: "bg-primary text-primary-foreground hover:bg-primary/90",
      ghost:   "bg-transparent text-foreground hover:bg-muted",
      outline: "border border-border bg-background text-foreground hover:bg-muted",
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
