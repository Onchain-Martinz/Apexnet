"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const PdfReader = dynamic(
  () => import("@/components/textbooks/pdf-reader").then((mod) => mod.PdfReader),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-muted">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    ),
  },
);

export { PdfReader };
