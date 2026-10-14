-- Phase 6 security controls: account lockout, encrypted PII envelopes and scoped API keys.
ALTER TABLE "users"
  ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "locked_until" TIMESTAMPTZ(3),
  ADD COLUMN "email_lookup_hash" VARCHAR(128),
  ADD COLUMN "email_ciphertext" BYTEA,
  ADD COLUMN "email_nonce" BYTEA,
  ADD COLUMN "email_auth_tag" BYTEA,
  ADD COLUMN "email_encryption_key_version" VARCHAR(64),
  ADD COLUMN "name_ciphertext" BYTEA,
  ADD COLUMN "name_nonce" BYTEA,
  ADD COLUMN "name_auth_tag" BYTEA,
  ADD COLUMN "name_encryption_key_version" VARCHAR(64),
  ADD CONSTRAINT "users_failed_login_attempts_check" CHECK ("failed_login_attempts" >= 0),
  ADD CONSTRAINT "users_email_envelope_check" CHECK (
    (("email_ciphertext" IS NULL) AND ("email_nonce" IS NULL) AND ("email_auth_tag" IS NULL) AND ("email_encryption_key_version" IS NULL)) OR
    (("email_ciphertext" IS NOT NULL) AND ("email_nonce" IS NOT NULL) AND ("email_auth_tag" IS NOT NULL) AND ("email_encryption_key_version" IS NOT NULL))
  ),
  ADD CONSTRAINT "users_name_envelope_check" CHECK (
    (("name_ciphertext" IS NULL) AND ("name_nonce" IS NULL) AND ("name_auth_tag" IS NULL) AND ("name_encryption_key_version" IS NULL)) OR
    (("name_ciphertext" IS NOT NULL) AND ("name_nonce" IS NOT NULL) AND ("name_auth_tag" IS NOT NULL) AND ("name_encryption_key_version" IS NOT NULL))
  );
CREATE UNIQUE INDEX "users_email_lookup_hash_key" ON "users"("email_lookup_hash");

CREATE TABLE "api_keys" (
  "id" UUID NOT NULL,
  "owner_user_id" UUID NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "prefix" VARCHAR(24) NOT NULL,
  "key_hash" CHAR(64) NOT NULL,
  "scopes" TEXT[] NOT NULL,
  "expires_at" TIMESTAMPTZ(3),
  "last_used_at" TIMESTAMPTZ(3),
  "revoked_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "api_keys_scopes_check" CHECK (cardinality("scopes") BETWEEN 1 AND 10),
  CONSTRAINT "api_keys_expiry_check" CHECK ("expires_at" IS NULL OR "expires_at" > "created_at")
);
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");
CREATE INDEX "api_keys_owner_user_id_revoked_at_expires_at_idx" ON "api_keys"("owner_user_id", "revoked_at", "expires_at");
CREATE INDEX "api_keys_created_by_user_id_created_at_idx" ON "api_keys"("created_by_user_id", "created_at" DESC);
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Audit events are append-only through normal SQL operations; retention is a privileged DBA process.
CREATE OR REPLACE FUNCTION "reject_audit_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit records are append-only' USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "audit_logs_append_only" BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "reject_audit_mutation"();
CREATE TRIGGER "medical_record_access_logs_append_only" BEFORE UPDATE OR DELETE ON "medical_record_access_logs"
  FOR EACH ROW EXECUTE FUNCTION "reject_audit_mutation"();
