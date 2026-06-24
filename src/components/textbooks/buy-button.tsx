"use client";

import dynamic from "next/dynamic";

// ── Buy Now button — client-only lazy boundary ───────────────────────────────
// BUG #2 root cause: /textbooks/[id]/page.tsx (a Server Component) statically
// imported the real BuyButton, which imports `flutterwave-react-v3`. Even
// though BuyButton itself is "use client" (the correct, normal pattern for a
// Server Component rendering a Client Component), Next.js still has to
// include flutterwave-react-v3 in the SSR module graph to generate that
// client reference. On this app, every Fast-Refresh recompile of this route
// reliably corrupted that vendor chunk on the very next request:
// `TypeError: Cannot read properties of undefined (reading 'call')` inside
// __webpack_require__, and in production builds the equivalent
// "Cannot find module './vendor-chunks/flutterwave-react-v3.js'".
//
// Fix: load the real implementation (buy-button-impl.tsx) via next/dynamic
// with `ssr: false`, so flutterwave-react-v3 never participates in SSR
// bundling for this route at all — it only ever loads in the browser, in its
// own chunk, lazily. `ssr: false` is invalid inside a Server Component, which
// is why this indirection exists: page.tsx imports this plain "use client"
// file (always fine), and only THIS file calls next/dynamic with ssr: false.
export const BuyButton = dynamic(
  () => import("./buy-button-impl").then((mod) => mod.BuyButton),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-14 w-full items-center justify-center rounded-button bg-muted text-[15px] font-semibold text-muted-foreground">
        Loading…
      </div>
    ),
  },
);
