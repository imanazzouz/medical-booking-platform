# CDN and media delivery policy

The application currently serves only public UI assets from `public/`; it does not implement an upload or medical-document storage API. `MEDIA_CDN_ORIGIN` optionally adds one HTTPS origin to Next.js `remotePatterns` and the runtime CSP. CI passes the same validated build variable through to the final image so both allowlists remain aligned; do not override it in the host runtime environment. Next Image emits AVIF/WebP variants with a one-day minimum optimizer TTL. It is intentionally not a wildcard allowlist.

## Production setup

1. Put only public brand imagery and explicitly approved provider profile assets behind the CDN. Configure the CDN origin to the application/static asset origin and set `MEDIA_CDN_ORIGIN=https://media.example.com` as a build variable. Rebuild the immutable image after changing it.
2. Use a CDN provider with TLS to origin, WAF, request-size limits, and origin access restrictions. Prevent direct-origin bypass or ensure client-IP headers are overwritten by the trusted edge.
3. Cache fingerprinted `/_next/static/*` assets as immutable. Cache public media by versioned URL. Never cache `/api/*`, `/dashboard/*`, `/admin/*`, `/booking/*`, authenticated responses, or user-specific HTML.
4. Medical records, prescriptions, lab results, imaging, and any patient-associated document must use private object storage with encryption, authorization checks, short-lived signed URLs, audit logging, and no shared-cache policy. Do not place PHI in the public media CDN or `public/` directory.
5. The current deployment does not provision a CDN account, object bucket, upload pipeline, or DNS zone. Those are provider-specific bootstrap steps and must be completed before enabling remote media.
