"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ── Base Input ──────────────────────────────────────────────────────────────

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            // Apex spec: radius 14px, height 48px, 16px on mobile prevents iOS zoom
            "h-12 w-full rounded-input border bg-background px-4",
            "text-[16px] sm:text-[15px] text-foreground placeholder:text-muted-foreground",
            "transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground",
            error
              ? "border-destructive focus:ring-destructive/20 focus:border-destructive"
              : "border-border",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-caption text-destructive" role="alert">{error}</p>
        )}
        {hint && !error && (
          <p className="text-caption text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

// ── Password Input (show / hide toggle) ────────────────────────────────────

export type PasswordInputProps = Omit<InputProps, "type">;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const inputId = id ?? "password";

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            className={cn(
              "h-12 w-full rounded-input border bg-background pl-4 pr-12",
              "text-[16px] sm:text-[15px] text-foreground placeholder:text-muted-foreground",
              "transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground",
              error
                ? "border-destructive focus:ring-destructive/20 focus:border-destructive"
                : "border-border",
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors touch-target"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible
              ? <EyeOff className="h-4 w-4" aria-hidden />
              : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>
        {error && (
          <p className="text-caption text-destructive" role="alert">{error}</p>
        )}
        {hint && !error && (
          <p className="text-caption text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
