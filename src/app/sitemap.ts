import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url, lastModified: new Date() },
    { url: `${siteConfig.url}/login`, lastModified: new Date() },
    { url: `${siteConfig.url}/signup`, lastModified: new Date() },
  ];
}
