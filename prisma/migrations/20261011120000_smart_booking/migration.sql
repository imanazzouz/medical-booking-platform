-- Smart scheduling/booking: explicit policy, optimistic version, waitlist,
-- idempotent notification outbox, and encrypted Web Push subscription storage.
CREATE TYPE "BookingMode" AS ENUM ('INSTANT', 'APPROVAL_REQUIRED');
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'OFFERED', 'BOOKED', 'EXPIRED', 'CANCELLED');
ALTER TYPE "AppointmentStatusChangeReason" ADD VALUE 'PROVIDER_APPROVED';
ALTER TYPE "AppointmentStatusChangeReason" ADD VALUE 'PROVIDER_REJECTED';

ALTER TABLE "services"
  ADD COLUMN "booking_mode" "BookingMode" NOT NULL DEFAULT 'INSTANT',
  ADD COLUMN "approval_hold_minutes" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "cancellation_notice_minutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "services"
  ADD CONSTRAINT "services_booking_policy_check"
  CHECK ("duration_minutes" > 0 AND "approval_hold_minutes" BETWEEN 1 AND 1440 AND "cancellation_notice_minutes" BETWEEN 0 AND 10080);

ALTER TABLE "appointment_slots" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "appointment_slots" ADD COLUMN "availability_rule_id" UUID;
DROP INDEX "appointment_slots_resource_key_starts_at_key";
ALTER TABLE "appointment_slots" ADD CONSTRAINT "appointment_slots_availability_rule_id_fkey" FOREIGN KEY ("availability_rule_id") REFERENCES "availability_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointment_slots"
  ADD CONSTRAINT "appointment_slots_valid_window_check" CHECK ("starts_at" < "ends_at"),
  ADD CONSTRAINT "appointment_slots_capacity_check" CHECK ("capacity" > 0 AND "booked_count" >= 0 AND "booked_count" <= "capacity");
CREATE INDEX "appointment_slots_availability_rule_id_idx" ON "appointment_slots"("availability_rule_id");
ALTER TABLE "appointments" ADD COLUMN "hold_expires_at" TIMESTAMPTZ(3);
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" VARCHAR(180);
ALTER TABLE "notifications" ADD COLUMN "appointment_id" UUID;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "notifications_appointment_id_template_key_status_idx" ON "notifications"("appointment_id", "template_key", "status");
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

-- Enforce non-overlap for physical/virtual resources even when two services
-- create different slot IDs. Half-open ranges allow adjacent appointments.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "appointment_slots"
  ADD CONSTRAINT "appointment_slots_resource_time_excl"
  EXCLUDE USING gist (
    "resource_key" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  ) WHERE ("deleted_at" IS NULL AND "status" <> 'BLOCKED');

ALTER TABLE "availability_rules"
  ADD CONSTRAINT "availability_rules_weekday_check" CHECK ("weekday" BETWEEN 1 AND 7),
  ADD CONSTRAINT "availability_rules_time_window_check" CHECK ("start_time" < "end_time"),
  ADD CONSTRAINT "availability_rules_date_range_check" CHECK ("valid_from" IS NULL OR "valid_until" IS NULL OR "valid_from" <= "valid_until");
ALTER TABLE "availability_exceptions"
  ADD CONSTRAINT "availability_exceptions_time_pair_check" CHECK (("start_time" IS NULL) = ("end_time" IS NULL)),
  ADD CONSTRAINT "availability_exceptions_time_order_check" CHECK ("start_time" IS NULL OR "start_time" < "end_time"),
  ADD CONSTRAINT "availability_exceptions_open_extra_window_check" CHECK ("type" <> 'OPEN_EXTRA' OR ("start_time" IS NOT NULL AND "end_time" IS NOT NULL));

CREATE TABLE "waitlist_entries" (
  "id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "service_id" UUID NOT NULL,
  "doctor_id" UUID,
  "location_id" UUID,
  "earliest_at" TIMESTAMPTZ(3) NOT NULL,
  "latest_at" TIMESTAMPTZ(3) NOT NULL,
  "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
  "offered_slot_id" UUID,
  "offered_until" TIMESTAMPTZ(3),
  "appointment_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "waitlist_entries_time_range_check" CHECK ("earliest_at" < "latest_at"),
  CONSTRAINT "waitlist_entries_offer_pair_check" CHECK (("status" = 'OFFERED' AND "offered_slot_id" IS NOT NULL AND "offered_until" IS NOT NULL) OR ("status" <> 'OFFERED' AND "offered_slot_id" IS NULL AND "offered_until" IS NULL)),
  CONSTRAINT "waitlist_entries_appointment_status_check" CHECK (("status" = 'BOOKED') = ("appointment_id" IS NOT NULL))
);
CREATE UNIQUE INDEX "waitlist_entries_appointment_id_key" ON "waitlist_entries"("appointment_id");
CREATE INDEX "waitlist_entries_service_id_status_earliest_at_latest_at_created_at_idx" ON "waitlist_entries"("service_id", "status", "earliest_at", "latest_at", "created_at");
CREATE INDEX "waitlist_entries_offered_slot_id_status_offered_until_idx" ON "waitlist_entries"("offered_slot_id", "status", "offered_until");
CREATE UNIQUE INDEX "waitlist_entries_active_patient_resource_key" ON "waitlist_entries"(
  "patient_id", "service_id", COALESCE("doctor_id", '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE("location_id", '00000000-0000-0000-0000-000000000000'::uuid)
) WHERE "status" IN ('WAITING', 'OFFERED') AND "deleted_at" IS NULL;

CREATE TABLE "push_subscriptions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "endpoint_hash" CHAR(64) NOT NULL,
  "endpoint_ciphertext" BYTEA NOT NULL,
  "endpoint_nonce" BYTEA NOT NULL,
  "endpoint_auth_tag" BYTEA NOT NULL,
  "p256dh_ciphertext" BYTEA NOT NULL,
  "p256dh_nonce" BYTEA NOT NULL,
  "p256dh_auth_tag" BYTEA NOT NULL,
  "auth_ciphertext" BYTEA NOT NULL,
  "auth_nonce" BYTEA NOT NULL,
  "auth_auth_tag" BYTEA NOT NULL,
  "encryption_key_version" VARCHAR(64) NOT NULL,
  "expiration_time" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "push_subscriptions_user_id_endpoint_hash_key" ON "push_subscriptions"("user_id", "endpoint_hash");
CREATE INDEX "push_subscriptions_user_id_deleted_at_idx" ON "push_subscriptions"("user_id", "deleted_at");

CREATE TABLE "notification_preferences" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "appointment_email_enabled" BOOLEAN NOT NULL DEFAULT true,
  "appointment_sms_enabled" BOOLEAN NOT NULL DEFAULT false,
  "appointment_push_enabled" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

CREATE TABLE "idempotency_records" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "operation" VARCHAR(32) NOT NULL,
  "key_hash" CHAR(64) NOT NULL,
  "request_hash" CHAR(64) NOT NULL,
  "appointment_id" UUID NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "idempotency_records_user_id_operation_key_hash_key" ON "idempotency_records"("user_id", "operation", "key_hash");
CREATE INDEX "idempotency_records_expires_at_idx" ON "idempotency_records"("expires_at");

ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_offered_slot_id_fkey" FOREIGN KEY ("offered_slot_id") REFERENCES "appointment_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
