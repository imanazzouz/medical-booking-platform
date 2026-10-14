# Vercel + Neon + Upstash deployment profile

This profile was prepared for the selected **web-only first release**. It does not provision vendor accounts or create live resources. The app uses PostgreSQL migrations; the archive contains schema/migrations, not a running PostgreSQL server or populated database. First Production build applies the migrations to the Neon database configured in Vercel.

## 1. Connect Vercel and GitHub

1. Push/import this repository into GitHub, then create a Vercel project from that repository with the repository root as the project root and Node.js 22.
2. Leave the framework as Next.js. `vercel.json` selects `npm run vercel-build`; Vercel installs the locked dependencies from `package-lock.json` itself. Do not commit or upload `node_modules`; it is platform-specific and Vercel builds its own dependency tree.
3. Connect Neon through its Vercel integration and enable branch databases for Preview deployments if previews will use database-backed routes. Production migrations run only when `VERCEL_ENV=production`; previews must use a separate Neon branch and should not point at the production branch.
4. Vercel Git integration performs deployments after repository checks. `.github/workflows/ci.yml` is a verification workflow, not an SSH/VPS deployment. Protect `main` and require that check before production deployments.

## 2. Neon PostgreSQL

Configure both Neon connection strings in each Vercel environment:

- `DATABASE_URL`: Neon pooled endpoint (`-pooler` hostname), for short-lived serverless requests.
- `DATABASE_URL_UNPOOLED`: Neon direct endpoint, for Prisma migrations and administrative schema operations.

The Prisma datasource uses `DATABASE_URL` at runtime and `DATABASE_URL_UNPOOLED` for migration commands. Keep TLS enabled (`sslmode=require`) and never paste credentials into GitHub, source files, or this document. The Production `vercel-build` command runs `prisma migrate deploy` before `next build`; the initial database is empty apart from the resulting schema and migration history. No demo or patient records are inserted.

Do not use `prisma migrate dev` against Production. Use reviewed, backward-compatible expand/contract migrations. Preview builds do not migrate a shared database; connect a separate Neon preview branch if you enable preview deployments.

## 3. Upstash Redis

Set `REDIS_URL` to the TLS `rediss://` connection string from the Upstash Redis database. Keep separate databases/credentials for Production and Preview. This is used for distributed rate limiting; the app fails closed when the store is unavailable.

## 4. Vercel environment variables

Set values separately for Production, Preview, and Development as appropriate:

- `APP_ORIGIN`: exact HTTPS origin used by CSRF/cookie checks (for example `https://your-domain.example`).
- `NEXT_PUBLIC_SITE_URL`: canonical public origin; `NEXT_PUBLIC_DEPLOYMENT_ENV=production` for Production and a non-production value for Preview.
- `NEXT_PUBLIC_USE_MOCK_DATA=false` for Production. Leave `NEXT_PUBLIC_SEO_INDEXING_ENABLED=false` until demo copy is replaced and real listings are verified.
- Optional `MEDIA_CDN_ORIGIN`: one HTTPS origin only; set the same value in all applicable Vercel environments so Next Image and runtime CSP remain aligned. Do not host patient records there.
- `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `REDIS_URL`.
- Unique `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `OTP_PEPPER`, `LOOKUP_HMAC_SECRET`, `CSRF_SECRET`, `API_KEY_PEPPER`, and `FIELD_ENCRYPTION_KEY` (base64 of 32 random bytes); configure the versioned `FIELD_ENCRYPTION_KEYS_JSON` ring if rotating keys.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMS_GATEWAY_URL`, and `SMS_GATEWAY_TOKEN`. OTP delivery uses these integrations directly; test with provider-approved sandbox destinations before public launch.
- `SENTRY_DSN` for server error capture and `NEXT_PUBLIC_SENTRY_DSN` for browser errors. Optional source-map upload needs `SENTRY_ORG` and `SENTRY_PROJECT` variables plus `SENTRY_AUTH_TOKEN` as a Vercel build secret; the token is used only during the build. Configure issue alerts/on-call routing in the Sentry project.
- LogRocket remains off by default. Do not set `NEXT_PUBLIC_LOGROCKET_BAA_APPROVED=true` or the app ID until the vendor terms, BAA/legal review, jurisdiction, data region, and retention are approved. When enabled, recording still requires explicit browser consent.

Vercel secrets are configured in its environment-variable UI; do not put production values in `.env.example` or the ZIP. A Production domain must be verified and `APP_ORIGIN`/`NEXT_PUBLIC_SITE_URL` must match it exactly.

## 5. Current web-only limitation

The existing notification, booking-maintenance, and availability workers are long-running loops and are **not started by Vercel**. As selected for the first web-only release:

- queued email/SMS/push notifications and scheduled reminders will not be dispatched by the background worker;
- expired pending bookings and waitlist offers will not be processed by the booking-maintenance worker;
- rolling availability materialization will not run every six hours.

Do not advertise these background-dependent features as active until workers are moved to a persistent worker host or deliberately converted to authenticated, bounded Vercel Cron jobs. This initial web-only profile does not implement those Cron replacements.

## 6. First-release checklist

- Create the Vercel, Neon, and Upstash accounts/resources and configure the variables/secrets above.
- Apply the Production schema via the first Vercel Production build and verify migration status in Neon.
- Create the first administrator through the reviewed bootstrap procedure from a trusted environment; do not store the bootstrap password in Git or Vercel build logs.
- Verify login/OTP, CSRF, Redis-backed rate limits, Sentry event scrubbing, and a consented LogRocket test using synthetic data only.
- Confirm that web-only limitations are acceptable before opening public booking. No compliance certification or live vendor approval is implied by these files.
