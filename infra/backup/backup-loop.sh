#!/usr/bin/env bash
set -Eeuo pipefail

: "${BACKUP_INTERVAL_SECONDS:=86400}"
: "${BACKUP_RETRY_SECONDS:=300}"
export RCLONE_CONFIG="${RCLONE_CONFIG:-/tmp/rclone.conf}"
: > "$RCLONE_CONFIG"
chmod 600 "$RCLONE_CONFIG"

while true; do
  started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  if /usr/local/bin/backup-once; then
    touch /tmp/backup-last-success
    echo "$started_at backup cycle succeeded"
    sleep "$BACKUP_INTERVAL_SECONDS"
  else
    echo "$started_at backup cycle failed; retrying in ${BACKUP_RETRY_SECONDS}s" >&2
    sleep "$BACKUP_RETRY_SECONDS"
  fi
done
