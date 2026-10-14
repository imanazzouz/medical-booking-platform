import type { MetadataRoute } from "next";

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_ORIGIN ?? "https://tibbi.example";
const isIndexableProduction = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production" && process.env.NEXT_PUBLIC_USE_MOCK_DATA === "false" && process.env.NEXT_PUBLIC_SEO_INDEXING_ENABLED === "true";

export default function robots(): MetadataRoute.Robots {
  if (!isIndexableProduction) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/search", "/privacy", "/terms"],
      disallow: ["/api/", "/admin", "/dashboard", "/booking/", "/sentry-tunnel"],
    },
    sitemap: new URL("/sitemap.xml", siteOrigin).toString(),
  };
}
