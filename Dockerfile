# syntax=docker/dockerfile:1.7
# All runtime stages use the same glibc-based Node image for Prisma/Argon2 native compatibility.
FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund
# Prisma generation is offline and uses a harmless build-only URL; no production database is contacted.
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public" DATABASE_URL_UNPOOLED="postgresql://build:build@127.0.0.1:5432/build?schema=public" npx prisma generate

FROM dependencies AS development
COPY . .
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]

FROM dependencies AS builder
ARG NEXT_PUBLIC_SITE_URL=https://tibbi.example
ARG NEXT_PUBLIC_DEPLOYMENT_ENV=production
ARG NEXT_PUBLIC_SEO_INDEXING_ENABLED=false
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG NEXT_PUBLIC_LOGROCKET_APP_ID=
ARG NEXT_PUBLIC_LOGROCKET_BAA_APPROVED=false
ARG MEDIA_CDN_ORIGIN=
ARG SENTRY_ORG=
ARG SENTRY_PROJECT=
ARG SENTRY_RELEASE=
COPY . .
# Build-only values satisfy schema validation if a statically rendered module reads configuration.
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
  NEXT_PUBLIC_DEPLOYMENT_ENV=${NEXT_PUBLIC_DEPLOYMENT_ENV} \
  NEXT_PUBLIC_SEO_INDEXING_ENABLED=${NEXT_PUBLIC_SEO_INDEXING_ENABLED} \
  NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN} \
  NEXT_PUBLIC_LOGROCKET_APP_ID=${NEXT_PUBLIC_LOGROCKET_APP_ID} \
  NEXT_PUBLIC_LOGROCKET_BAA_APPROVED=${NEXT_PUBLIC_LOGROCKET_BAA_APPROVED} \
  NEXT_PUBLIC_USE_MOCK_DATA=false \
  MEDIA_CDN_ORIGIN=${MEDIA_CDN_ORIGIN} \
  SENTRY_ORG=${SENTRY_ORG} \
  SENTRY_PROJECT=${SENTRY_PROJECT} \
  SENTRY_RELEASE=${SENTRY_RELEASE} \
  NODE_ENV=production \
  DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public" \
  DATABASE_URL_UNPOOLED="postgresql://build:build@127.0.0.1:5432/build?schema=public" \
  APP_ORIGIN="https://tibbi.example" \
  ACCESS_TOKEN_SECRET="build-only-access-secret-not-for-runtime-000000000000" \
  REFRESH_TOKEN_SECRET="build-only-refresh-secret-not-for-runtime-00000000" \
  OTP_PEPPER="build-only-otp-pepper-not-for-runtime-0000000000000000" \
  LOOKUP_HMAC_SECRET="build-only-lookup-secret-not-for-runtime-000000000000" \
  CSRF_SECRET="build-only-csrf-secret-not-for-runtime-00000000000000" \
  API_KEY_PEPPER="build-only-api-key-pepper-not-for-runtime-000000000000" \
  FIELD_ENCRYPTION_KEY="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" \
  FIELD_ENCRYPTION_ACTIVE_KEY_VERSION="v1" \
  REDIS_URL="redis://127.0.0.1:6379" \
  SMTP_HOST="localhost" SMTP_PORT=1025 SMTP_USER="build" SMTP_PASSWORD="build" SMTP_FROM="build@example.test" \
  SMS_GATEWAY_URL="https://sms.example.test/send" SMS_GATEWAY_TOKEN="build-only"
RUN --mount=type=secret,id=sentry_auth_token,required=false \
  if [ -f /run/secrets/sentry_auth_token ]; then export SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)"; fi; \
  npm run bundle:workers && npm run build
# Keep build/test tools out of the application runtime image.
RUN npm prune --omit=dev --no-audit

FROM base AS runner
# Keep runtime CSP and the Next Image allowlist aligned with the build-time CDN origin.
ARG MEDIA_CDN_ORIGIN=
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 MEDIA_CDN_ORIGIN=${MEDIA_CDN_ORIGIN}
RUN groupadd --system --gid 1001 nextjs && useradd --system --uid 1001 --gid nextjs nextjs
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
# Install only production dependencies (including generated Prisma client and native engines).
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/dist/workers ./dist/workers
RUN mkdir -p /app/.next/cache && chown -R nextjs:nextjs /app/.next/cache
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

# Isolated short-lived migration image. Prisma CLI and the schema are not shipped with the web app.
FROM base AS migrator
WORKDIR /app
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node prisma ./prisma
USER node
ENTRYPOINT ["./node_modules/.bin/prisma"]
CMD ["migrate", "deploy"]

# Backup sidecar. Encryption is client-side; object storage credentials are runtime-only.
FROM alpine:3.24 AS backup
RUN apk add --no-cache age bash ca-certificates postgresql16-client rclone \
  && addgroup -S backup \
  && adduser -S -u 10001 -G backup backup
ENV HOME=/tmp RCLONE_CONFIG=/tmp/rclone.conf
COPY --chmod=0755 infra/backup/backup-loop.sh /usr/local/bin/backup-loop
COPY --chmod=0755 infra/backup/backup-once.sh /usr/local/bin/backup-once
USER backup
HEALTHCHECK --interval=15m --timeout=5s --start-period=26h --retries=2 \
  CMD test -f /tmp/backup-last-success && find /tmp/backup-last-success -mmin -1500 -print -quit | grep -q .
ENTRYPOINT ["/usr/local/bin/backup-loop"]
