const logRocketScriptHosts = [
  "https://cdn.logrocket.io", "https://cdn.lr-ingest.io", "https://cdn.lr-in.com", "https://cdn.lr-in-prod.com",
  "https://cdn.lr-ingest.com", "https://cdn.ingest-lr.com", "https://cdn.lr-intake.com", "https://cdn.intake-lr.com",
  "https://cdn.logr-ingest.com", "https://cdn.lrkt-in.com", "https://cdn.lgrckt-in.com", "https://cdn.logr-in.com",
];
const logRocketConnectHosts = [
  "https://*.logrocket.io", "https://*.lr-ingest.io", "https://*.logrocket.com", "https://*.lr-in.com",
  "https://*.lr-in-prod.com", "https://*.lr-ingest.com", "https://*.ingest-lr.com", "https://*.lr-intake.com",
  "https://*.intake-lr.com", "https://*.logr-ingest.com", "https://*.lrkt-in.com", "https://*.lgrckt-in.com",
  "https://*.logr-in.com",
];

function getMediaCdnSource(value: string | undefined): string {
  if (!value) return "";
  const url = new URL(value);
  if (
    url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash
    || url.username || url.password || url.href !== `${url.origin}/`
  ) {
    throw new Error("MEDIA_CDN_ORIGIN must be an HTTPS origin without credentials, path, query, or fragment");
  }
  return ` ${url.origin}`;
}

/** Strict CSP for the App Router. External telemetry origins are absent unless explicitly approved. */
export function buildContentSecurityPolicy(nonce: string, production: boolean): string {
  const logRocketEnabled = process.env.NEXT_PUBLIC_LOGROCKET_BAA_APPROVED === "true" && Boolean(process.env.NEXT_PUBLIC_LOGROCKET_APP_ID);
  const mediaOrigin = getMediaCdnSource(process.env.MEDIA_CDN_ORIGIN);
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${production ? "" : " 'unsafe-eval'"}${logRocketEnabled ? ` ${logRocketScriptHosts.join(" ")}` : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${mediaOrigin}`,
    "font-src 'self' data:",
    `connect-src 'self'${production ? "" : " ws: wss:"}${logRocketEnabled ? ` ${logRocketConnectHosts.join(" ")}` : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    ...(logRocketEnabled ? ["child-src 'self' blob:"] : []),
    "manifest-src 'self'",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}
