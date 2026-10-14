# Edge / WAF deployment baseline

This is a vendor-neutral deployment contract because the hosting/CDN provider is not specified. Apply the equivalent managed WAF controls in the chosen provider before opening public traffic.

## Required edge controls

1. Terminate TLS 1.2+ at the trusted CDN/load balancer, redirect HTTP to HTTPS before the request reaches Next.js, renew certificates automatically, and restrict direct origin ingress to trusted edge networks. Do not enable TLS inspection that exports patient payloads to an unapproved third party.
2. Enable the provider's maintained OWASP CRS / managed application rules for SQLi, XSS, path traversal, protocol violations, and known CVEs. Start in log mode in staging, review false positives, then block in production; use narrow exclusions rather than disabling rule groups.
3. Enable network and HTTP flood protection, bot controls, connection/time/body-size limits, and per-IP rate limiting. Suggested starting limits: login 15 requests/15 minutes/IP, registration 3–5/hour/IP, and OTP resend 3/hour/IP; application limits currently include login 15/15 minutes/IP plus 8/15 minutes/email, registration 5/hour/IP plus 3/hour/email, and Redis-backed OTP limits. Tune only with observed, privacy-safe telemetry.
4. Set request body caps appropriate to the API (for example, 1 MiB JSON; upload endpoints must use a separate authenticated object-storage flow with malware scanning and strict MIME/size limits). Reject unsupported methods and malformed HTTP framing at the edge.
5. Do not cache authenticated/API writes or `/api/v1/patient`, `/api/v1/bookings`, `/api/v1/waitlist`, `/api/v1/notifications`, or provider-admin responses. Cache only explicitly public GET responses whose handler sets a public cache policy.
6. The edge must overwrite, not append blindly to, client-supplied `Forwarded`/`X-Forwarded-For` and related IP headers. Only trust client-IP headers from the configured proxy chain; otherwise IP-keyed throttling is spoofable.
7. Keep WAF logs free of request bodies, cookies, Authorization headers, OTPs, email/phone, and medical data. Use short retention, access control, and an approved region/processor; alert on blocks and rate-limit triggers without including payloads.

## Rollout and validation

- Validate rules in staging with the real CDN path, including CSP nonce/hydration, OTP, login, booking, waitlist, and legitimate Arabic/Unicode text.
- Test direct-origin bypass, oversized bodies, HTTP redirect, expired TLS, bot/rate-limit behavior, and failover. Do not rely on application middleware to stop volumetric DDoS.
- Certificate pinning is not enabled for browser clients. Native clients may pin only with backup pins and a tested rotation/recovery process.
- Record the chosen provider, ruleset/version, exclusions, origin allowlist, rate thresholds, alert owner, and rollback procedure in the deployment runbook before launch.
