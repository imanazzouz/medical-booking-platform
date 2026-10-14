# Encrypted database backups

The `backup` Docker target produces a minimal sidecar containing `pg_dump`, `age`, and `rclone`. The production Compose service takes a PostgreSQL custom-format snapshot immediately at startup and every `BACKUP_INTERVAL_SECONDS` (default 24 hours), streams it through client-side `age` encryption into a temporary object with `rclone rcat`, then promotes that object to its final name only after the full pipeline succeeds. Failed streams clean up the temporary object. Plaintext dumps are not written to container storage, and dump size does not require an equally large temporary filesystem. Failed jobs retry after five minutes; container health becomes healthy after its first successful backup and goes unhealthy after a stale success marker.

## Required runtime configuration

- `DATABASE_URL`: direct/unpooled TLS-enabled managed PostgreSQL connection, with a dedicated least-privilege backup role that can read every required schema. For Neon, do not point `pg_dump` at the transaction pooler. URL-encode reserved characters in credentials.
- `BACKUP_AGE_RECIPIENT`: public age key only. Keep the corresponding private identity in a separate, access-controlled recovery vault; never store it beside the bucket or in this repository.
- `BACKUP_REMOTE`: an isolated prefix such as `s3:medical-booking-backups/production`.
- `RCLONE_CONFIG_S3_TYPE=s3`, provider, endpoint, region, access key and secret. Use a dedicated write/list/delete identity restricted to that prefix and TLS.
- `BACKUP_RETENTION_DAYS`: default 35. Enable bucket versioning and Object Lock/retention at the provider; deletion by this container is not a substitute for immutable backup protection.

Provision a separate bucket/prefix and credentials for staging and production. Configure object-storage encryption and region/processor approvals. Do not enable the backup service until credentials are provisioned; alert on `backup` unhealthy, image pull failures, and upload retry logs. The wrapper never emits dump contents or the `DATABASE_URL`; restrict log access and ensure storage endpoints/credentials are not embedded in error messages.

## Restore and recovery drill

At least quarterly, retrieve an encrypted artifact using a controlled recovery identity, decrypt it in an isolated network, and restore into a disposable PostgreSQL instance matching the production major version and extensions. Run `pg_restore --list`, Prisma migration status, application readiness, and booking/read-only integrity checks. Record achieved RPO/RTO and securely destroy the temporary plaintext dump/database. Never test restore over production. The project does not claim a tested RPO/RTO until this drill is run and documented.
