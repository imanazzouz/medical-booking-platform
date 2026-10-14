import SentryConfig from "@sentry/nextjs/config";
const { withSentryConfig } = SentryConfig;

const mediaOrigin = process.env.MEDIA_CDN_ORIGIN;
let mediaRemotePatterns = [];
if (mediaOrigin) {
  const url = new URL(mediaOrigin);
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || url.username || url.password || url.href !== `${url.origin}/`) {
    throw new Error("MEDIA_CDN_ORIGIN must be an HTTPS origin without credentials, path, query, or fragment");
  }
  mediaRemotePatterns = [{ protocol: "https", hostname: url.hostname, ...(url.port ? { port: url.port } : {}), pathname: "/**" }];
}

const nextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  typedRoutes: true,
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: mediaRemotePatterns,
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86_400,
  },
};

const sentryUploadEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);
const sentryBuildOptions = {
  tunnelRoute: "/sentry-tunnel",
  ...(sentryUploadEnabled ? {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    ...(process.env.SENTRY_RELEASE ? { release: { name: process.env.SENTRY_RELEASE } } : {}),
    sourcemaps: { deleteSourcemapsAfterUpload: true },
  } : { sourcemaps: { disable: true } }),
  silent: true,
  disableLogger: true,
};

export default withSentryConfig(nextConfig, sentryBuildOptions);
