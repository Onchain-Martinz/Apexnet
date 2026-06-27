"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:items-center sm:pb-0">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-t-card sm:rounded-card glass-surface-elevated p-card">
        {title && (
          <div className="mb-element flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-foreground">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
