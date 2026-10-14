# Docker Compose runbook (alternative deployment profile)

**Selected production target is Vercel + Neon + Upstash.** Follow [`vercel-neon-upstash.md`](vercel-neon-upstash.md) for the active plan. This document preserves the earlier single-host Docker Compose alternative for local development or a future persistent-worker host; it is not the active GitHub deployment workflow.

## 1. Local Docker Compose

1. Install Docker Engine and the current Docker Compose plugin.
2. Copy `.env.example` to `.env`; use URL-safe local Postgres password material and generate unique throwaway local keys. Never reuse development keys in staging or production.
3. Start application plus local PostgreSQL 16 and Redis 7:

   ```bash
   docker compose up --build
   ```

4. In a separate terminal, apply the full migration chain once:

   ```bash
   docker compose --profile migrations run --rm migrate
   ```

5. Optional: start the notification, booking-maintenance, and availability workers:

   ```bash
   docker compose --profile workers up --build
   ```

The database and Redis ports bind to loopback only. Named volumes persist local data. `docker compose down -v` permanently deletes those local volumes; never use it on data you need.

## 2. Staging and production GitHub setup

The default branch convention is `develop` → **staging** and `main` → **production**. Both GitHub Environments must be created before the deploy job can run. Add required reviewers and prevent self-approval for production; protect `main` and `develop`, require the CI status check, and restrict deployment branches.

For **each** GitHub Environment, configure variables:

- `SITE_URL` (full HTTPS origin), `PUBLIC_HOST` (hostname only), `ACME_EMAIL`.
- Optional public build variables: `MEDIA_CDN_ORIGIN`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_LOGROCKET_APP_ID`, `NEXT_PUBLIC_LOGROCKET_BAA_APPROVED` (default/required value: `false`), `SENTRY_ORG`, `SENTRY_PROJECT`, and `SEO_INDEXING_ENABLED` (default `false`; set true only after replacing demo/legal copy and verifying real directory content). `MEDIA_CDN_ORIGIN` is baked into the runtime image so Next Image and the runtime CSP use the same allowlist; do not add it to `.env.production`. Sentry client/server source maps are uploaded only when both Sentry slugs and the upload token are configured; client maps are deleted from the image after upload.

Configure `SENTRY_AUTH_TOKEN` as a GitHub Environment secret, scoped to the Sentry project/release permissions needed for source-map upload. The workflow passes it to the build as a BuildKit secret; it is not copied into the image or host `.env.production`. `SENTRY_DSN` is runtime-only for the server; `NEXT_PUBLIC_SENTRY_DSN` is the public client DSN.

Configure secrets:

- `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH` (absolute path), `DEPLOY_SSH_PRIVATE_KEY`, and a pre-verified `DEPLOY_KNOWN_HOSTS` entry. Do not run `ssh-keyscan` dynamically in CI.
- Optional `SENTRY_AUTH_TOKEN` for source-map upload, scoped to the Sentry project/release permissions needed. The workflow uses it only as a BuildKit secret; never add it to the VPS runtime environment.

Provision a Linux host with Docker/Compose, a firewall, and DNS for the environment. Create `${DEPLOY_PATH}/.env.production`, owned by the deployment account with mode `0600`; it contains that environment's `APP_ORIGIN`, pooled `DATABASE_URL`, direct `DATABASE_URL_UNPOOLED`, `REDIS_URL`, authentication/encryption/OTP/API-key keys, SMTP/SMS configuration, optional server `SENTRY_DSN`, backup recipient and S3-compatible credentials, `PUBLIC_HOST`, and `ACME_EMAIL`. Use separate secrets, database, Redis, backup prefix, and encryption key rings for staging and production. Inject secrets from an approved secret manager where available; do not commit or upload this file from CI.

Give the host's Docker client pull-only access to the private GHCR packages, pin the SSH host key in GitHub, and allow inbound 80/443 only from the CDN/WAF edge if one is used. The deploy workflow publishes app, migration, and backup images, passes their immutable registry digests over SSH, applies migrations in a dedicated one-off container, then updates Compose services and waits for `/api/v1/ready`. Application containers do not run schema migrations at boot.

## 3. Migration and rollback policy

- The initial migration directory was normalized to `20261010120000_backend_initial` so lexical order is: base schema, smart booking, security layer. No production database was recorded as having applied these migrations. If any shared database has already applied the old directory name, **stop** and reconcile `_prisma_migrations` with the DBA; never rename or edit an applied migration.
- `prisma migrate deploy` is the only production migration command. Run it once per release before replacing application containers. CI runs the entire chain against a fresh PostgreSQL service.
- Use expand/contract: add nullable/backward-compatible structures first, deploy code that dual-reads/writes as required, backfill, then remove old columns in a later reviewed migration. Do not combine destructive DDL with a code release that still uses the old shape.
- Take and verify a backup before destructive or high-risk migrations. Database rollback is a forward fix or a tested restore, not `prisma migrate reset` and not an automatic rollback. This single-host Compose workflow can briefly interrupt requests during container replacement and is not blue/green.

## 4. Observability and privacy

Sentry captures errors only when its DSNs are configured. Request bodies, URLs/query strings, user identity, breadcrumbs, tags, contexts, and free-form exception messages are scrubbed; performance traces and replay are disabled. Browser events are tunneled through the same origin. If `SENTRY_ORG`, `SENTRY_PROJECT`, and the BuildKit-only `SENTRY_AUTH_TOKEN` are configured, the build uploads source maps and deletes client maps from the output; otherwise source-map upload remains disabled. Configure issue alerts and on-call routing in the Sentry project itself; these require an actual Sentry account and are not provisioned by this repository.

LogRocket is opt-in: its App ID and explicit BAA/legal approval build flag must be configured, then the user must choose “Allow session recording” in the consent panel. The panel is rendered only when the feature is approved/configured. Text/inputs/images are masked, network and console capture are disabled, IP collection is suppressed, and page URLs are sanitized. A LogRocket session may continue across client-side navigation after a user grants consent, so the panel discloses that scope; withdrawal persists a denial and reloads to stop subsequent capture. Previously captured data remains subject to the vendor's retention controls. Do not enable replay until vendor terms, BAA, jurisdiction, retention, and data-region are approved. The code does not claim the approval exists.

## 5. Backups, CDN, and edge

- The optional S3-compatible `backup` sidecar must be configured with a separate prefix/identity, client-side `age` encryption, provider versioning/immutability, alerts, and tested recovery. See [`../backup/README.md`](../backup/README.md).
- Caddy terminates HTTPS and renews certificates automatically. If a CDN/WAF is placed in front, enable TLS-to-origin, restrict origin access, and use the CDN/media rules in [`../cdn/README.md`](../cdn/README.md) and [`../security/edge-controls.md`](../security/edge-controls.md).
- Only public, approved assets may be cached. The current application does not implement media upload/object storage. Patient documents must not be placed on a public CDN.

## Release gates / known blockers

The workflow blocks critical advisories across all dependencies and high/critical advisories in production dependencies. The latest local `npm audit --omit=dev --audit-level=high` reports zero production vulnerabilities. Full `npm audit` still reports 7 high package findings in the development/build chain, mainly the `braces` advisory transitive through Tailwind CSS 3 and `eslint-config-next`/`@next/eslint-plugin-next`; no critical findings remain. These packages are pruned from the runtime image, but remain a build-pipeline risk. Address them in a separately tested Tailwind/Next ESLint toolchain upgrade before tightening the all-dependencies gate to high severity. Provisioned hosts, real DNS/CDN/WAF, managed PostgreSQL/Redis, GitHub Environment approvals, object storage, credentials, backup restore drills, and production RPO/RTO are **not created by repository files** and remain operator tasks. The Compose reference is not an HA/zero-downtime architecture.
