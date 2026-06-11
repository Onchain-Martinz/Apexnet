export const siteConfig = {
  name: "Apex",
  tagline: "Your university library. In your pocket.",
  description:
    "A mobile-first digital textbook platform built for African universities.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;
