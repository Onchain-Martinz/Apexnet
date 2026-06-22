"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Search,
  X,
  Loader2,
} from "lucide-react";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const MIN_SCALE = 0.6;
const MAX_SCALE = 2.4;
const SCALE_STEP = 0.2;

// How many pages on either side of the current page stay mounted.
const RENDER_WINDOW = 2;

// Fallback aspect ratio (height / width) used for placeholder sizing
// before the first page has reported its real dimensions.
const DEFAULT_ASPECT_RATIO = 1.414;

interface PdfReaderProps {
  fileUrl: string;
  initialPage?: number;
  onProgressChange?: (page: number, numPages: number) => void;
}

export function PdfReader({ fileUrl, initialPage, onProgressChange }: PdfReaderProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(initialPage && initialPage > 0 ? initialPage : 1);
  const [scale, setScale] = useState(1);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pageAspectRatio, setPageAspectRatio] = useState(DEFAULT_ASPECT_RATIO);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibilityRef = useRef<Map<number, number>>(new Map());
  const didRestoreScrollRef = useRef(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [searching, setSearching] = useState(false);

  const onDocumentLoadSuccess = useCallback(
    (pdf: PDFDocumentProxy) => {
      setNumPages(pdf.numPages);
      setPdfDoc(pdf);
      const target = initialPage && initialPage >= 1 && initialPage <= pdf.numPages ? initialPage : 1;
      setPageNumber(target);
    },
    [initialPage],
  );

  const handlePageLoadSuccess = useCallback((page: PDFPageProxy) => {
    const viewport = page.getViewport({ scale: 1 });
    const ratio = viewport.height / viewport.width;
    setPageAspectRatio((prev) => (Math.abs(prev - ratio) > 0.001 ? ratio : prev));
  }, []);

  // ── Track scroll-container width so pages can fill it (ebook feel) ──────
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── IntersectionObserver: keep the page counter in sync with scroll ─────
  useEffect(() => {
    if (!numPages) return;
    const root = scrollContainerRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const page = Number((entry.target as HTMLElement).dataset.page);
          if (!page) continue;
          visibilityRef.current.set(page, entry.intersectionRatio);
        }

        let bestPage = 0;
        let bestRatio = 0;
        visibilityRef.current.forEach((ratio, page) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestPage = page;
          }
        });

        if (bestPage > 0 && bestRatio > 0) {
          setPageNumber(bestPage);
        }
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    observerRef.current = observer;
    pageRefs.current.forEach((el) => observer.observe(el));
    const visibility = visibilityRef.current;

    return () => {
      observer.disconnect();
      observerRef.current = null;
      visibility.clear();
    };
  }, [numPages]);

  const registerPageRef = useCallback((page: number, el: HTMLDivElement | null) => {
    const refs = pageRefs.current;
    const prev = refs.get(page);
    if (prev && observerRef.current) {
      observerRef.current.unobserve(prev);
    }
    if (el) {
      refs.set(page, el);
      observerRef.current?.observe(el);
    } else {
      refs.delete(page);
      visibilityRef.current.delete(page);
    }
  }, []);

  // ── Restore scroll position to the initial page once, after layout ──────
  useEffect(() => {
    if (didRestoreScrollRef.current) return;
    if (!numPages || containerWidth === 0) return;

    const target = initialPage && initialPage >= 1 && initialPage <= numPages ? initialPage : 1;
    didRestoreScrollRef.current = true;
    if (target <= 1) return;

    const raf = requestAnimationFrame(() => {
      pageRefs.current.get(target)?.scrollIntoView({ behavior: "auto", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [numPages, containerWidth, initialPage]);

  // ── Report live page/percentage to parent for header + progress saving ──
  useEffect(() => {
    if (!numPages) return;
    onProgressChange?.(pageNumber, numPages);
  }, [pageNumber, numPages, onProgressChange]);

  const goToPage = useCallback(
    (page: number) => {
      if (!numPages) return;
      const target = Math.min(Math.max(page, 1), numPages);
      setPageNumber(target);
      pageRefs.current.get(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [numPages],
  );

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, Math.round((s + SCALE_STEP) * 10) / 10));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(MIN_SCALE, Math.round((s - SCALE_STEP) * 10) / 10));
  }, []);

  const runSearch = useCallback(
    async (term: string) => {
      const query = term.trim();
      setSearchQuery(query);
      setSearchMatches([]);
      setSearchIndex(0);

      if (!pdfDoc || !query) return;

      setSearching(true);
      try {
        const matches: number[] = [];
        const needle = query.toLowerCase();

        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const content = await page.getTextContent();
          const text = content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ")
            .toLowerCase();

          if (text.includes(needle)) {
            matches.push(i);
          }
        }

        setSearchMatches(matches);
        if (matches.length > 0) {
          goToPage(matches[0]);
        }
      } finally {
        setSearching(false);
      }
    },
    [pdfDoc, goToPage],
  );

  const goToMatch = useCallback(
    (direction: 1 | -1) => {
      if (searchMatches.length === 0) return;
      const next =
        (searchIndex + direction + searchMatches.length) % searchMatches.length;
      setSearchIndex(next);
      goToPage(searchMatches[next]);
    },
    [searchMatches, searchIndex, goToPage],
  );

  const textRenderer = useMemo(() => {
    if (!searchQuery) return undefined;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    return ({ str }: { str: string }) =>
      str.replace(regex, '<mark class="bg-amber-300/70">$1</mark>');
  }, [searchQuery]);

  const renderWidth = containerWidth > 0 ? containerWidth * scale : 0;
  const placeholderHeight = renderWidth > 0 ? renderWidth * pageAspectRatio : undefined;

  return (
    <div
      className="mx-auto flex h-full w-full max-w-full flex-col overflow-hidden bg-muted lg:max-w-[70%]"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-background px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToPage(pageNumber - 1)}
            disabled={pageNumber <= 1}
            aria-label="Previous page"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <span className="min-w-[64px] text-center text-[13px] font-medium text-foreground">
            {numPages ? `${pageNumber} / ${numPages}` : "—"}
          </span>
          <button
            type="button"
            onClick={() => goToPage(pageNumber + 1)}
            disabled={!numPages || pageNumber >= numPages}
            aria-label="Next page"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            aria-label="Zoom out"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-30"
          >
            <ZoomOut className="h-[18px] w-[18px]" aria-hidden />
          </button>
          <span className="min-w-[44px] text-center text-[13px] font-medium text-foreground">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            aria-label="Zoom in"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-30"
          >
            <ZoomIn className="h-[18px] w-[18px]" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            aria-label="Search in document"
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted ${
              searchOpen ? "text-primary" : "text-foreground"
            }`}
          >
            <Search className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </div>
      </div>

      {/* ── Search bar ──────────────────────────────────────────── */}
      {searchOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch(searchTerm);
          }}
          className="flex items-center gap-2 border-b border-border bg-background px-3 py-2"
        >
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search in document"
            className="h-9 flex-1 rounded-input border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          {searching ? (
            <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-muted-foreground" aria-hidden />
          ) : searchQuery ? (
            <span className="flex-shrink-0 text-[12px] text-muted-foreground">
              {searchMatches.length > 0
                ? `${searchIndex + 1}/${searchMatches.length}`
                : "0 results"}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => goToMatch(-1)}
            disabled={searchMatches.length === 0}
            aria-label="Previous match"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => goToMatch(1)}
            disabled={searchMatches.length === 0}
            aria-label="Next match"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              setSearchTerm("");
              setSearchQuery("");
              setSearchMatches([]);
            }}
            aria-label="Close search"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </form>
      )}

      {/* ── Document — continuous scroll, virtualized ──────────────── */}
      <div
        ref={scrollContainerRef}
        className="flex flex-1 flex-col items-center gap-4 overflow-y-auto overflow-x-hidden px-2 py-4"
      >
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex h-full items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
            </div>
          }
          error={
            <div className="flex h-full items-center justify-center py-20 text-[13px] text-muted-foreground">
              Failed to load document.
            </div>
          }
        >
          {numPages && renderWidth > 0
            ? Array.from({ length: numPages }, (_, i) => i + 1).map((page) => {
                const inRange = Math.abs(page - pageNumber) <= RENDER_WINDOW;

                return (
                  <div
                    key={page}
                    ref={(el) => registerPageRef(page, el)}
                    data-page={page}
                    style={{
                      width: renderWidth,
                      minHeight: inRange ? undefined : placeholderHeight,
                    }}
                  >
                    {inRange && (
                      <Page
                        pageNumber={page}
                        width={renderWidth}
                        customTextRenderer={textRenderer}
                        renderAnnotationLayer={false}
                        onLoadSuccess={handlePageLoadSuccess}
                      />
                    )}
                  </div>
                );
              })
            : null}
        </Document>
      </div>
    </div>
  );
}
