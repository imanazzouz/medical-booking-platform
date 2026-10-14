#!/usr/bin/env bash
set -Eeuo pipefail

: "${APP_IMAGE:?Immutable web/worker image digest is required}"
: "${MIGRATOR_IMAGE:?Immutable migration image digest is required}"
: "${BACKUP_IMAGE:?Immutable backup image digest is required}"
: "${DEPLOYMENT_ENV:?Set staging or production}"

case "$DEPLOYMENT_ENV" in staging|production) ;; *) echo "Invalid DEPLOYMENT_ENV" >&2; exit 2 ;; esac
for image in "$APP_IMAGE" "$MIGRATOR_IMAGE" "$BACKUP_IMAGE"; do
  [[ "$image" =~ ^ghcr\.io/[a-z0-9_.-]+/[a-z0-9_.-]+@[[:alnum:]:.-]+$ ]] || { echo "Image must be a GHCR digest reference" >&2; exit 2; }
done
[[ -r .env.production ]] || { echo "Missing protected .env.production" >&2; exit 2; }

compose=(docker compose --env-file .env.production -f infra/compose.production.yaml)
export APP_IMAGE MIGRATOR_IMAGE BACKUP_IMAGE

# Pull every environment service and execute migrations exactly once before application replacement.
"${compose[@]}" --profile migration pull
"${compose[@]}" --profile migration run --rm migrate
"${compose[@]}" up -d --remove-orphans

# Fail deployment if the app does not become ready; keep the prior images for manual rollback.
app_id="$("${compose[@]}" ps -q app)"
for attempt in $(seq 1 48); do
  status="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$app_id" 2>/dev/null || true)"
  [[ "$status" == healthy ]] && { echo "$DEPLOYMENT_ENV deployment is healthy"; exit 0; }
  [[ "$status" == unhealthy || "$status" == exited ]] && break
  sleep 5
done
"${compose[@]}" ps
 echo "$DEPLOYMENT_ENV deployment did not become healthy; investigate and roll forward or restore from a verified backup" >&2
exit 1
