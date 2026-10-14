#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT must be the public age recipient}"
: "${BACKUP_REMOTE:?BACKUP_REMOTE must be an rclone S3 remote path}"
: "${BACKUP_RETENTION_DAYS:=35}"

if [[ ! "$BACKUP_RETENTION_DAYS" =~ ^[1-9][0-9]{0,3}$ ]]; then
  echo "BACKUP_RETENTION_DAYS must be a positive integer" >&2
  exit 2
fi
if [[ ! "$BACKUP_REMOTE" =~ ^s3:[^/]+/.+ ]]; then
  echo "BACKUP_REMOTE must have the form s3:bucket/non-empty-prefix" >&2
  exit 2
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
filename="medical-db-${stamp}.dump.age"
final_remote="$BACKUP_REMOTE/$filename"
partial_remote="$BACKUP_REMOTE/.${filename}.partial"
cleanup_partial() { rclone deletefile "$partial_remote" >/dev/null 2>&1 || true; }
trap cleanup_partial ERR

# Stream the custom-format dump through client-side encryption to a temporary object;
# plaintext never reaches disk. Promote it only after every pipeline process succeeds.
pg_dump --format=custom --no-owner --no-acl --dbname="$DATABASE_URL" \
  | age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" \
  | rclone rcat "$partial_remote" --s3-upload-concurrency 2
rclone moveto "$partial_remote" "$final_remote"
trap - ERR

# Retention is limited to this configured prefix; enable bucket versioning/object lock separately.
rclone delete "$BACKUP_REMOTE" --min-age "${BACKUP_RETENTION_DAYS}d" --include 'medical-db-*.dump.age' --log-level NOTICE
printf '%s encrypted backup uploaded\n' "$stamp"
