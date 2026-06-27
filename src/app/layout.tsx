import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@/styles/globals.css";
import { siteConfig } from "@/config/site";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "ApexNet — Knowledge. Connected.",
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: siteConfig.name,
    url: siteConfig.url,
    title: "ApexNet — Knowledge. Connected.",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary",
    title: "ApexNet — Knowledge. Connected.",
    description: siteConfig.description,
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Dark-first design (Phase 1) — single theme-color regardless of system
  // preference, matching the new --background token.
  themeColor: "#050816",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
