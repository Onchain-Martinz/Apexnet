"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PdfReader } from "@/components/textbooks/pdf-reader-client";
import { ProgressBar } from "@/components/ui/progress-bar";
import { routes } from "@/config/routes";

const SAVE_DEBOUNCE_MS = 2000;

interface ReaderViewProps {
  textbookId: string;
  fileUrl: string;
  initialPage: number;
  initialTotalPages: number | null;
}

export function ReaderView({ textbookId, fileUrl, initialPage, initialTotalPages }: ReaderViewProps) {
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages ?? 0);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedPageRef = useRef(initialPage);

  const handleProgressChange = useCallback(
    (currentPage: number, numPages: number) => {
      setPage(currentPage);
      setTotalPages(numPages);

      if (currentPage === lastSavedPageRef.current) return;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        lastSavedPageRef.current = currentPage;
        fetch(routes.api.readingProgress, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ textbookId, currentPage, totalPages: numPages }),
          keepalive: true,
        }).catch(() => {});
      }, SAVE_DEBOUNCE_MS);
    },
    [textbookId],
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const percentage = totalPages > 0 ? (page / totalPages) * 100 : 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 px-page py-2">
        <p className="text-[13px] font-medium text-foreground">
          {totalPages > 0 ? `Page ${page} of ${totalPages}` : "—"}
        </p>
        <p className="text-[13px] font-semibold text-foreground">{Math.round(percentage)}%</p>
      </div>
      <ProgressBar percentage={percentage} className="h-1 rounded-none" />
      <div className="flex-1 overflow-hidden">
        <PdfReader fileUrl={fileUrl} initialPage={initialPage} onProgressChange={handleProgressChange} />
      </div>
    </div>
  );
}
