-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING_VERIFICATION', 'LOCKED', 'DISABLED');

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('REGISTRATION', 'LOGIN', 'PHONE_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('CLINIC', 'RADIOLOGY_CENTER', 'LAB_CENTER');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrganizationMemberRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF', 'DOCTOR');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DoctorVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('CONSULTATION', 'IMAGING', 'LAB_TEST', 'OTHER');

-- CreateEnum
CREATE TYPE "AvailabilityExceptionType" AS ENUM ('CLOSED', 'OPEN_EXTRA');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('AVAILABLE', 'FULL', 'BLOCKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AppointmentStatusChangeReason" AS ENUM ('BOOKED', 'PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'PATIENT_CANCELLED', 'PROVIDER_CANCELLED', 'ADMIN_ACTION', 'COMPLETED_BY_PROVIDER', 'MARKED_NO_SHOW', 'HOLD_EXPIRED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'ADYEN', 'PAYPAL', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MedicalRecordType" AS ENUM ('PRESCRIPTION', 'LAB_RESULT', 'IMAGING_REPORT', 'REFERRAL', 'CLINICAL_NOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'HIDDEN', 'REJECTED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'DATA_PROCESSING', 'MARKETING');

-- CreateEnum
CREATE TYPE "ConsentAction" AS ENUM ('GRANTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "email_verified" TIMESTAMPTZ(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "password_hash" VARCHAR(255),
    "phone_ciphertext" BYTEA,
    "phone_nonce" BYTEA,
    "phone_auth_tag" BYTEA,
    "phone_lookup_hash" VARCHAR(128),
    "phone_verified_at" TIMESTAMPTZ(3),
    "encryption_key_version" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expires" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "patient_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "preferred_locale" VARCHAR(10) NOT NULL DEFAULT 'ar',
    "date_of_birth_ciphertext" BYTEA,
    "date_of_birth_nonce" BYTEA,
    "date_of_birth_auth_tag" BYTEA,
    "gender_ciphertext" BYTEA,
    "gender_nonce" BYTEA,
    "gender_auth_tag" BYTEA,
    "encryption_key_version" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "public_slug" VARCHAR(180) NOT NULL,
    "publicBiography" TEXT,
    "years_of_experience" INTEGER,
    "verification_status" "DoctorVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "license_number_ciphertext" BYTEA,
    "license_number_nonce" BYTEA,
    "license_number_auth_tag" BYTEA,
    "license_lookup_hash" VARCHAR(128),
    "encryption_key_version" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "doctor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialties" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name_ar" VARCHAR(180) NOT NULL,
    "name_en" VARCHAR(180) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_specialties" (
    "doctor_id" UUID NOT NULL,
    "specialty_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "doctor_specialties_pkey" PRIMARY KEY ("doctor_id","specialty_id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'DRAFT',
    "public_email" VARCHAR(320),
    "public_website" VARCHAR(2048),
    "description" TEXT,
    "phone_ciphertext" BYTEA,
    "phone_nonce" BYTEA,
    "phone_auth_tag" BYTEA,
    "phone_lookup_hash" VARCHAR(128),
    "encryption_key_version" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_profiles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "license_ciphertext" BYTEA,
    "license_nonce" BYTEA,
    "license_auth_tag" BYTEA,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "clinic_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_center_profiles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "license_ciphertext" BYTEA,
    "license_nonce" BYTEA,
    "license_auth_tag" BYTEA,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "radiology_center_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_center_profiles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "license_ciphertext" BYTEA,
    "license_nonce" BYTEA,
    "license_auth_tag" BYTEA,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "lab_center_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_translations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "organization_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "OrganizationMemberRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "address_line" VARCHAR(300) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "region" VARCHAR(120),
    "postal_code" VARCHAR(32),
    "country_code" CHAR(2) NOT NULL DEFAULT 'DZ',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Africa/Algiers',
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" "ServiceType" NOT NULL,
    "code" VARCHAR(100),
    "duration_minutes" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'DZD',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "requires_doctor" BOOLEAN NOT NULL DEFAULT false,
    "preparation_notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_translations" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "preparation_notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "service_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_doctors" (
    "service_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "service_doctors_pkey" PRIMARY KEY ("service_id","doctor_id")
);

-- CreateTable
CREATE TABLE "service_locations" (
    "service_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "service_locations_pkey" PRIMARY KEY ("service_id","location_id")
);

-- CreateTable
CREATE TABLE "availability_rules" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "doctor_id" UUID,
    "location_id" UUID,
    "weekday" INTEGER NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Africa/Algiers',
    "valid_from" DATE,
    "valid_until" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_exceptions" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "type" "AvailabilityExceptionType" NOT NULL,
    "start_time" TIME(0),
    "end_time" TIME(0),
    "internal_reason" VARCHAR(300),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "availability_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_slots" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "doctor_id" UUID,
    "location_id" UUID,
    "resource_key" VARCHAR(300) NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "booked_count" INTEGER NOT NULL DEFAULT 0,
    "status" "SlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "appointment_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "slot_id" UUID NOT NULL,
    "booking_reference" VARCHAR(32) NOT NULL,
    "idempotency_key_hash" VARCHAR(64),
    "request_hash" VARCHAR(64),
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "patient_note_ciphertext" BYTEA,
    "patient_note_nonce" BYTEA,
    "patient_note_auth_tag" BYTEA,
    "encryption_key_version" VARCHAR(64),
    "confirmed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_status_history" (
    "id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "from_status" "AppointmentStatus",
    "to_status" "AppointmentStatus" NOT NULL,
    "reason" "AppointmentStatusChangeReason" NOT NULL,
    "actor_user_id" UUID,
    "internal_note_ciphertext" BYTEA,
    "internal_note_nonce" BYTEA,
    "internal_note_auth_tag" BYTEA,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "appointment_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "provider_reference" VARCHAR(255),
    "idempotency_key" VARCHAR(255) NOT NULL,
    "payment_method_last4" CHAR(4),
    "paid_at" TIMESTAMPTZ(3),
    "refunded_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "organization_id" UUID,
    "doctor_id" UUID,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "template_key" VARCHAR(120) NOT NULL,
    "payload_ciphertext" BYTEA,
    "payload_nonce" BYTEA,
    "payload_auth_tag" BYTEA,
    "encryption_key_version" VARCHAR(64),
    "provider_message_id" VARCHAR(255),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "scheduled_at" TIMESTAMPTZ(3),
    "sent_at" TIMESTAMPTZ(3),
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_records" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "author_doctor_id" UUID,
    "appointment_id" UUID,
    "type" "MedicalRecordType" NOT NULL,
    "title_ciphertext" BYTEA NOT NULL,
    "title_nonce" BYTEA NOT NULL,
    "title_auth_tag" BYTEA NOT NULL,
    "content_ciphertext" BYTEA NOT NULL,
    "content_nonce" BYTEA NOT NULL,
    "content_auth_tag" BYTEA NOT NULL,
    "encryption_key_version" VARCHAR(64) NOT NULL,
    "encrypted_object_key" VARCHAR(512),
    "mime_type" VARCHAR(120),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_record_access_logs" (
    "id" UUID NOT NULL,
    "record_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "request_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "medical_record_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" VARCHAR(120) NOT NULL,
    "resource_type" VARCHAR(100) NOT NULL,
    "resource_id" VARCHAR(100),
    "request_id" VARCHAR(100),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "ConsentType" NOT NULL,
    "action" "ConsentAction" NOT NULL,
    "policy_version" VARCHAR(80) NOT NULL,
    "source" VARCHAR(80),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "identifier_hash" VARCHAR(128) NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "code_hash" VARCHAR(128) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "jti" VARCHAR(64) NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "replaced_by_jti" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_lookup_hash_key" ON "users"("phone_lookup_hash");

-- CreateIndex
CREATE INDEX "users_status_deleted_at_idx" ON "users"("status", "deleted_at");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "accounts_userId_deleted_at_idx" ON "accounts"("userId", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_expires_idx" ON "sessions"("userId", "expires");

-- CreateIndex
CREATE INDEX "sessions_expires_idx" ON "sessions"("expires");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX "verification_tokens_expires_idx" ON "verification_tokens"("expires");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_user_id_key" ON "patient_profiles"("user_id");

-- CreateIndex
CREATE INDEX "patient_profiles_deleted_at_idx" ON "patient_profiles"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_user_id_key" ON "doctor_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_public_slug_key" ON "doctor_profiles"("public_slug");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_license_lookup_hash_key" ON "doctor_profiles"("license_lookup_hash");

-- CreateIndex
CREATE INDEX "doctor_profiles_verification_status_deleted_at_idx" ON "doctor_profiles"("verification_status", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "specialties_code_key" ON "specialties"("code");

-- CreateIndex
CREATE INDEX "specialties_is_active_deleted_at_idx" ON "specialties"("is_active", "deleted_at");

-- CreateIndex
CREATE INDEX "doctor_specialties_specialty_id_deleted_at_idx" ON "doctor_specialties"("specialty_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_phone_lookup_hash_key" ON "organizations"("phone_lookup_hash");

-- CreateIndex
CREATE INDEX "organizations_type_status_deleted_at_idx" ON "organizations"("type", "status", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_profiles_organization_id_key" ON "clinic_profiles"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "radiology_center_profiles_organization_id_key" ON "radiology_center_profiles"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "lab_center_profiles_organization_id_key" ON "lab_center_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "organization_translations_locale_deleted_at_idx" ON "organization_translations"("locale", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "organization_translations_organization_id_locale_key" ON "organization_translations"("organization_id", "locale");

-- CreateIndex
CREATE INDEX "organization_members_user_id_status_deleted_at_idx" ON "organization_members"("user_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "organization_members_organization_id_role_status_idx" ON "organization_members"("organization_id", "role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "locations_city_country_code_deleted_at_idx" ON "locations"("city", "country_code", "deleted_at");

-- CreateIndex
CREATE INDEX "locations_organization_id_deleted_at_idx" ON "locations"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "services_organization_id_type_is_active_deleted_at_idx" ON "services"("organization_id", "type", "is_active", "deleted_at");

-- CreateIndex
CREATE INDEX "services_type_is_active_idx" ON "services"("type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "services_organization_id_code_key" ON "services"("organization_id", "code");

-- CreateIndex
CREATE INDEX "service_translations_locale_deleted_at_idx" ON "service_translations"("locale", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "service_translations_service_id_locale_key" ON "service_translations"("service_id", "locale");

-- CreateIndex
CREATE INDEX "service_doctors_doctor_id_deleted_at_idx" ON "service_doctors"("doctor_id", "deleted_at");

-- CreateIndex
CREATE INDEX "service_locations_location_id_deleted_at_idx" ON "service_locations"("location_id", "deleted_at");

-- CreateIndex
CREATE INDEX "availability_rules_service_id_weekday_is_active_deleted_at_idx" ON "availability_rules"("service_id", "weekday", "is_active", "deleted_at");

-- CreateIndex
CREATE INDEX "availability_rules_doctor_id_weekday_is_active_idx" ON "availability_rules"("doctor_id", "weekday", "is_active");

-- CreateIndex
CREATE INDEX "availability_rules_location_id_weekday_is_active_idx" ON "availability_rules"("location_id", "weekday", "is_active");

-- CreateIndex
CREATE INDEX "availability_exceptions_rule_id_date_deleted_at_idx" ON "availability_exceptions"("rule_id", "date", "deleted_at");

-- CreateIndex
CREATE INDEX "availability_exceptions_date_type_idx" ON "availability_exceptions"("date", "type");

-- CreateIndex
CREATE INDEX "appointment_slots_service_id_starts_at_status_deleted_at_idx" ON "appointment_slots"("service_id", "starts_at", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "appointment_slots_doctor_id_starts_at_idx" ON "appointment_slots"("doctor_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointment_slots_location_id_starts_at_idx" ON "appointment_slots"("location_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_slots_resource_key_starts_at_key" ON "appointment_slots"("resource_key", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_booking_reference_key" ON "appointments"("booking_reference");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_idempotency_key_hash_key" ON "appointments"("idempotency_key_hash");

-- CreateIndex
CREATE INDEX "appointments_patient_id_status_created_at_idx" ON "appointments"("patient_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "appointments_slot_id_status_idx" ON "appointments"("slot_id", "status");

-- CreateIndex
CREATE INDEX "appointments_status_created_at_idx" ON "appointments"("status", "created_at");

-- CreateIndex
CREATE INDEX "appointment_status_history_appointment_id_created_at_idx" ON "appointment_status_history"("appointment_id", "created_at");

-- CreateIndex
CREATE INDEX "appointment_status_history_actor_user_id_created_at_idx" ON "appointment_status_history"("actor_user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_reference_key" ON "payments"("provider_reference");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_appointment_id_status_idx" ON "payments"("appointment_id", "status");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_appointment_id_key" ON "reviews"("appointment_id");

-- CreateIndex
CREATE INDEX "reviews_organization_id_status_created_at_idx" ON "reviews"("organization_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reviews_doctor_id_status_created_at_idx" ON "reviews"("doctor_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reviews_patient_id_created_at_idx" ON "reviews"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_status_scheduled_at_idx" ON "notifications"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "medical_records_patient_id_type_created_at_idx" ON "medical_records"("patient_id", "type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "medical_records_author_doctor_id_created_at_idx" ON "medical_records"("author_doctor_id", "created_at");

-- CreateIndex
CREATE INDEX "medical_records_appointment_id_idx" ON "medical_records"("appointment_id");

-- CreateIndex
CREATE INDEX "medical_records_deleted_at_idx" ON "medical_records"("deleted_at");

-- CreateIndex
CREATE INDEX "medical_record_access_logs_record_id_created_at_idx" ON "medical_record_access_logs"("record_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "medical_record_access_logs_actor_user_id_created_at_idx" ON "medical_record_access_logs"("actor_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_created_at_idx" ON "audit_logs"("resource_type", "resource_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "consent_records_user_id_type_created_at_idx" ON "consent_records"("user_id", "type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "otp_challenges_identifier_hash_purpose_created_at_idx" ON "otp_challenges"("identifier_hash", "purpose", "created_at" DESC);

-- CreateIndex
CREATE INDEX "otp_challenges_user_id_purpose_expires_at_idx" ON "otp_challenges"("user_id", "purpose", "expires_at");

-- CreateIndex
CREATE INDEX "otp_challenges_expires_at_idx" ON "otp_challenges"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_jti_key" ON "refresh_tokens"("jti");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_revoked_at_expires_at_idx" ON "refresh_tokens"("user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_revoked_at_idx" ON "refresh_tokens"("family_id", "revoked_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_specialties" ADD CONSTRAINT "doctor_specialties_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_specialties" ADD CONSTRAINT "doctor_specialties_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_profiles" ADD CONSTRAINT "clinic_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_center_profiles" ADD CONSTRAINT "radiology_center_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_center_profiles" ADD CONSTRAINT "lab_center_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_translations" ADD CONSTRAINT "organization_translations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_translations" ADD CONSTRAINT "service_translations_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_doctors" ADD CONSTRAINT "service_doctors_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_doctors" ADD CONSTRAINT "service_doctors_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_locations" ADD CONSTRAINT "service_locations_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_locations" ADD CONSTRAINT "service_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "availability_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_slots" ADD CONSTRAINT "appointment_slots_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_slots" ADD CONSTRAINT "appointment_slots_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_slots" ADD CONSTRAINT "appointment_slots_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "appointment_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_author_doctor_id_fkey" FOREIGN KEY ("author_doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_access_logs" ADD CONSTRAINT "medical_record_access_logs_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_access_logs" ADD CONSTRAINT "medical_record_access_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Production integrity constraints not expressible in Prisma schema.
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "appointment_slots"
  ADD CONSTRAINT "appointment_slots_valid_interval_chk" CHECK ("starts_at" < "ends_at"),
  ADD CONSTRAINT "appointment_slots_capacity_chk" CHECK ("capacity" > 0 AND "booked_count" >= 0 AND "booked_count" <= "capacity");

ALTER TABLE "appointment_slots"
  ADD CONSTRAINT "appointment_slots_no_resource_overlap_excl"
  EXCLUDE USING gist (
    "resource_key" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  ) WHERE ("deleted_at" IS NULL);

ALTER TABLE "availability_rules"
  ADD CONSTRAINT "availability_rules_weekday_chk" CHECK ("weekday" BETWEEN 1 AND 7),
  ADD CONSTRAINT "availability_rules_time_range_chk" CHECK ("start_time" < "end_time"),
  ADD CONSTRAINT "availability_rules_valid_dates_chk" CHECK ("valid_from" IS NULL OR "valid_until" IS NULL OR "valid_from" <= "valid_until");

ALTER TABLE "availability_exceptions"
  ADD CONSTRAINT "availability_exceptions_time_pair_chk" CHECK (("start_time" IS NULL) = ("end_time" IS NULL)),
  ADD CONSTRAINT "availability_exceptions_time_range_chk" CHECK ("start_time" IS NULL OR "start_time" < "end_time"),
  ADD CONSTRAINT "availability_exceptions_open_extra_time_chk" CHECK ("type" <> 'OPEN_EXTRA' OR ("start_time" IS NOT NULL AND "end_time" IS NOT NULL));

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_range_chk" CHECK ("rating" BETWEEN 1 AND 5),
  ADD CONSTRAINT "reviews_exactly_one_target_chk" CHECK (("organization_id" IS NOT NULL)::int + ("doctor_id" IS NOT NULL)::int = 1);

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_positive_amount_chk" CHECK ("amount" > 0);
ALTER TABLE "otp_challenges"
  ADD CONSTRAINT "otp_challenges_attempts_chk" CHECK ("attempts" >= 0 AND "max_attempts" BETWEEN 1 AND 10);
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_attempt_count_chk" CHECK ("attempt_count" >= 0);

-- Fast contains/ILIKE city matching for directory searches.
CREATE INDEX "locations_city_trgm_idx" ON "locations" USING gin ("city" gin_trgm_ops) WHERE "deleted_at" IS NULL;

-- Enforce one type-specific profile matching each organization type, including nested writes.
CREATE OR REPLACE FUNCTION "enforce_organization_profile_kind"() RETURNS trigger AS $$
DECLARE
  target_id uuid;
  target_type "OrganizationType";
  clinic_count integer;
  radiology_count integer;
  lab_count integer;
BEGIN
  IF TG_TABLE_NAME = 'organizations' THEN
    target_id := NEW."id";
  ELSE
    target_id := COALESCE(NEW."organization_id", OLD."organization_id");
  END IF;
  SELECT "type" INTO target_type FROM "organizations" WHERE "id" = target_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT count(*) INTO clinic_count FROM "clinic_profiles" WHERE "organization_id" = target_id;
  SELECT count(*) INTO radiology_count FROM "radiology_center_profiles" WHERE "organization_id" = target_id;
  SELECT count(*) INTO lab_count FROM "lab_center_profiles" WHERE "organization_id" = target_id;
  IF target_type = 'CLINIC' AND (clinic_count <> 1 OR radiology_count <> 0 OR lab_count <> 0) THEN
    RAISE EXCEPTION 'Organization % must have exactly one clinic profile', target_id USING ERRCODE = '23514';
  ELSIF target_type = 'RADIOLOGY_CENTER' AND (radiology_count <> 1 OR clinic_count <> 0 OR lab_count <> 0) THEN
    RAISE EXCEPTION 'Organization % must have exactly one radiology profile', target_id USING ERRCODE = '23514';
  ELSIF target_type = 'LAB_CENTER' AND (lab_count <> 1 OR clinic_count <> 0 OR radiology_count <> 0) THEN
    RAISE EXCEPTION 'Organization % must have exactly one lab profile', target_id USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "organizations_profile_kind_ct"
AFTER INSERT OR UPDATE ON "organizations" DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "enforce_organization_profile_kind"();
CREATE CONSTRAINT TRIGGER "clinic_profiles_kind_ct"
AFTER INSERT OR UPDATE OR DELETE ON "clinic_profiles" DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "enforce_organization_profile_kind"();
CREATE CONSTRAINT TRIGGER "radiology_profiles_kind_ct"
AFTER INSERT OR UPDATE OR DELETE ON "radiology_center_profiles" DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "enforce_organization_profile_kind"();
CREATE CONSTRAINT TRIGGER "lab_profiles_kind_ct"
AFTER INSERT OR UPDATE OR DELETE ON "lab_center_profiles" DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "enforce_organization_profile_kind"();

-- Ensure service category matches the owning provider type.
CREATE OR REPLACE FUNCTION "enforce_service_organization_type"() RETURNS trigger AS $$
DECLARE
  provider_type "OrganizationType";
BEGIN
  SELECT "type" INTO provider_type FROM "organizations" WHERE "id" = NEW."organization_id";
  IF (NEW."type" = 'CONSULTATION' AND provider_type <> 'CLINIC') OR
     (NEW."type" = 'IMAGING' AND provider_type <> 'RADIOLOGY_CENTER') OR
     (NEW."type" = 'LAB_TEST' AND provider_type <> 'LAB_CENTER') THEN
    RAISE EXCEPTION 'Service type % does not match provider type %', NEW."type", provider_type USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "services_provider_type_trg"
BEFORE INSERT OR UPDATE OF "type", "organization_id" ON "services"
FOR EACH ROW EXECUTE FUNCTION "enforce_service_organization_type"();

-- Reviews can only be submitted for completed appointments by the patient who booked them.
CREATE OR REPLACE FUNCTION "enforce_review_appointment_owner"() RETURNS trigger AS $$
DECLARE
  appointment_patient uuid;
  appointment_status "AppointmentStatus";
BEGIN
  SELECT "patient_id", "status" INTO appointment_patient, appointment_status
  FROM "appointments" WHERE "id" = NEW."appointment_id";
  IF NOT FOUND OR appointment_patient <> NEW."patient_id" OR appointment_status <> 'COMPLETED' THEN
    RAISE EXCEPTION 'Review requires a completed appointment owned by the reviewing patient' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "reviews_completed_appointment_trg"
BEFORE INSERT OR UPDATE OF "appointment_id", "patient_id" ON "reviews"
FOR EACH ROW EXECUTE FUNCTION "enforce_review_appointment_owner"();
