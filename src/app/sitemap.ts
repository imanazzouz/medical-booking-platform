import type { MetadataRoute } from "next";

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_ORIGIN ?? "https://tibbi.example";
const isIndexableProduction = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production" && process.env.NEXT_PUBLIC_USE_MOCK_DATA === "false" && process.env.NEXT_PUBLIC_SEO_INDEXING_ENABLED === "true";

/** Only publish verified canonical pages. Sample provider/doctor/legal content is deliberately excluded. */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!isIndexableProduction) return [];
  return [
    { url: new URL("/", siteOrigin).toString(), changeFrequency: "weekly", priority: 1 },
    { url: new URL("/search", siteOrigin).toString(), changeFrequency: "daily", priority: 0.9 },
  ];
}
