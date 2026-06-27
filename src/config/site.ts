export const siteConfig = {
  name: "ApexNet",
  tagline: "Your university library. In your pocket.",
  description:
    "ApexNet is the digital textbook platform connecting students and lecturers through organized knowledge.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;
