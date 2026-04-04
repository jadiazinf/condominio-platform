CREATE TYPE "public"."acceptance_status" AS ENUM('pending', 'accepted', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."access_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."admin_invitation_status" AS ENUM('pending', 'accepted', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."allocation_strategy" AS ENUM('fifo', 'designated', 'fifo_interest_first');--> statement-breakpoint
CREATE TYPE "public"."assembly_minute_status" AS ENUM('draft', 'approved', 'voided');--> statement-breakpoint
CREATE TYPE "public"."assembly_type" AS ENUM('ordinary', 'extraordinary');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('INSERT', 'UPDATE', 'DELETE');--> statement-breakpoint
CREATE TYPE "public"."bank_account_category" AS ENUM('national', 'international');--> statement-breakpoint
CREATE TYPE "public"."bank_payment_method" AS ENUM('transfer', 'pago_movil', 'interbancario', 'wire_transfer', 'ach', 'zelle', 'paypal', 'wise', 'crypto', 'other');--> statement-breakpoint
CREATE TYPE "public"."bank_statement_entry_status" AS ENUM('unmatched', 'matched', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."bank_statement_entry_type" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TYPE "public"."bank_statement_import_status" AS ENUM('processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'quarterly', 'semi_annual', 'annual', 'custom');--> statement-breakpoint
CREATE TYPE "public"."billing_receipt_status" AS ENUM('draft', 'issued', 'paid', 'partial', 'voided');--> statement-breakpoint
CREATE TYPE "public"."board_member_status" AS ENUM('active', 'inactive', 'replaced');--> statement-breakpoint
CREATE TYPE "public"."board_position" AS ENUM('president', 'secretary', 'treasurer', 'substitute_president', 'substitute_secretary', 'substitute_treasurer');--> statement-breakpoint
CREATE TYPE "public"."budget_status" AS ENUM('draft', 'approved', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."budget_type" AS ENUM('monthly', 'quarterly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."charge_category" AS ENUM('ordinary', 'extraordinary', 'reserve_fund', 'social_benefits', 'non_common', 'fine', 'interest', 'late_fee', 'discount', 'credit_note', 'debit_note', 'other');--> statement-breakpoint
CREATE TYPE "public"."charge_status" AS ENUM('pending', 'paid', 'partial', 'cancelled', 'exonerated');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'delivered', 'failed', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('web', 'ios', 'android');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."distribution_method" AS ENUM('by_aliquot', 'equal_split', 'fixed_per_unit');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('invoice', 'receipt', 'statement', 'contract', 'regulation', 'minutes', 'other');--> statement-breakpoint
CREATE TYPE "public"."event_log_category" AS ENUM('payment', 'quota', 'reconciliation', 'worker', 'notification', 'gateway', 'auth', 'subscription', 'receipt', 'system');--> statement-breakpoint
CREATE TYPE "public"."event_log_level" AS ENUM('info', 'warn', 'error', 'critical');--> statement-breakpoint
CREATE TYPE "public"."event_log_result" AS ENUM('success', 'failure', 'partial');--> statement-breakpoint
CREATE TYPE "public"."event_log_source" AS ENUM('api', 'worker', 'webhook', 'cron', 'system');--> statement-breakpoint
CREATE TYPE "public"."expense_status" AS ENUM('pending', 'approved', 'rejected', 'paid');--> statement-breakpoint
CREATE TYPE "public"."gateway_type" AS ENUM('stripe', 'banco_plaza', 'bnc', 'paypal', 'zelle', 'other');--> statement-breakpoint
CREATE TYPE "public"."interest_cap_type" AS ENUM('percentage_of_principal', 'fixed', 'none');--> statement-breakpoint
CREATE TYPE "public"."interest_type" AS ENUM('simple', 'compound', 'fixed_amount');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_type" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TYPE "public"."ledger_reference_type" AS ENUM('charge', 'receipt', 'payment', 'interest', 'late_fee', 'discount', 'credit_note', 'debit_note', 'adjustment', 'void_reversal');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('country', 'province', 'city');--> statement-breakpoint
CREATE TYPE "public"."match_type" AS ENUM('auto_reference', 'auto_amount_date', 'manual');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('admin', 'accountant', 'support', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('message', 'notification', 'announcement');--> statement-breakpoint
CREATE TYPE "public"."notification_category" AS ENUM('payment', 'quota', 'announcement', 'reminder', 'alert', 'system');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email', 'push');--> statement-breakpoint
CREATE TYPE "public"."ownership_type" AS ENUM('owner', 'co-owner', 'tenant', 'family_member', 'authorized');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('transfer', 'cash', 'card', 'mobile_payment', 'gateway', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'pending_verification', 'completed', 'failed', 'refunded', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."receipt_type" AS ENUM('original', 'complementary', 'corrective');--> statement-breakpoint
CREATE TYPE "public"."recipient_type" AS ENUM('user', 'condominium', 'building', 'unit');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_status" AS ENUM('in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."service_provider_type" AS ENUM('individual', 'company', 'cooperative', 'government', 'internal');--> statement-breakpoint
CREATE TYPE "public"."subscription_audit_action" AS ENUM('created', 'activated', 'deactivated', 'updated', 'cancelled', 'renewed', 'terms_accepted', 'price_changed');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trial', 'active', 'inactive', 'cancelled', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."ticket_category" AS ENUM('technical', 'billing', 'feature_request', 'general', 'bug', 'maintenance', 'payment_issue', 'access_request', 'noise_complaint');--> statement-breakpoint
CREATE TYPE "public"."ticket_channel" AS ENUM('resident_to_admin', 'resident_to_support', 'admin_to_support');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ve_account_type" AS ENUM('corriente', 'ahorro', 'divisas');--> statement-breakpoint
CREATE TYPE "public"."wizard_type" AS ENUM('payment_concept');--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"location_type" "location_type" NOT NULL,
	"parent_id" uuid,
	"code" varchar(50),
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"symbol" varchar(10),
	"is_base_currency" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"decimals" integer DEFAULT 2,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "currencies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_currency_id" uuid NOT NULL,
	"to_currency_id" uuid NOT NULL,
	"rate" numeric(20, 8) NOT NULL,
	"effective_date" date NOT NULL,
	"source" varchar(100),
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "check_different_currencies" CHECK (from_currency_id != to_currency_id)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" varchar(128) NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"phone_country_code" varchar(10),
	"phone_number" varchar(50),
	"photo_url" text,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"id_document_type" varchar(50),
	"id_document_number" varchar(50),
	"address" varchar(500),
	"location_id" uuid,
	"preferred_language" varchar(10) DEFAULT 'es',
	"preferred_currency_id" uuid,
	"is_active" boolean DEFAULT true,
	"is_email_verified" boolean DEFAULT false,
	"last_login" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"module" varchar(50) NOT NULL,
	"action" varchar(50) NOT NULL,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_system_role" boolean DEFAULT false,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"assigned_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "management_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"legal_name" varchar(255),
	"tax_id_type" varchar(5),
	"tax_id_number" varchar(50),
	"email" varchar(255) NOT NULL,
	"phone_country_code" varchar(10),
	"phone" varchar(50),
	"website" varchar(255),
	"address" varchar(500),
	"location_id" uuid,
	"is_active" boolean DEFAULT true,
	"logo_url" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid,
	"preferred_currency_id" uuid,
	CONSTRAINT "management_companies_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "condominiums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"address" varchar(500),
	"location_id" uuid,
	"email" varchar(255),
	"phone" varchar(50),
	"phone_country_code" varchar(10),
	"default_currency_id" uuid,
	"rif" varchar(20),
	"receipt_number_format" varchar(100),
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "condominiums_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "condominium_management_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid NOT NULL,
	"management_company_id" uuid NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "buildings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"address" varchar(500),
	"floors_count" integer,
	"units_count" integer,
	"bank_account_holder" varchar(255),
	"bank_name" varchar(100),
	"bank_account_number" varchar(100),
	"bank_account_type" varchar(50),
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"condominium_id" uuid,
	"building_id" uuid,
	"management_company_id" uuid,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" uuid,
	"registered_by" uuid,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"unit_number" varchar(50) NOT NULL,
	"floor" integer,
	"area_m2" numeric(10, 2),
	"bedrooms" integer,
	"bathrooms" integer,
	"parking_spaces" integer DEFAULT 0,
	"parking_identifiers" text[],
	"storage_identifier" varchar(50),
	"aliquot_percentage" numeric(10, 6),
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "unit_ownerships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"user_id" uuid,
	"full_name" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"phone_country_code" varchar(10),
	"id_document_type" varchar(50),
	"id_document_number" varchar(50),
	"is_registered" boolean DEFAULT false,
	"ownership_type" "ownership_type" NOT NULL,
	"ownership_percentage" numeric(5, 2),
	"title_deed_number" varchar(100),
	"title_deed_date" date,
	"start_date" date NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true,
	"is_primary_residence" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "chk_unregistered_contact" CHECK ("unit_ownerships"."user_id" IS NOT NULL OR ("unit_ownerships"."full_name" IS NOT NULL AND ("unit_ownerships"."email" IS NOT NULL OR "unit_ownerships"."phone" IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "interest_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid,
	"building_id" uuid,
	"payment_concept_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"interest_type" "interest_type" NOT NULL,
	"interest_rate" numeric(10, 6),
	"fixed_amount" numeric(15, 2),
	"calculation_period" varchar(50),
	"grace_period_days" integer DEFAULT 0,
	"currency_id" uuid,
	"is_active" boolean DEFAULT true,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "entity_payment_gateways" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_gateway_id" uuid NOT NULL,
	"condominium_id" uuid,
	"building_id" uuid,
	"entity_configuration" jsonb,
	"is_active" boolean DEFAULT true,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_gateways" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"gateway_type" "gateway_type" NOT NULL,
	"configuration" jsonb,
	"supported_currencies" uuid[],
	"is_active" boolean DEFAULT true,
	"is_sandbox" boolean DEFAULT false,
	"metadata" jsonb,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payment_gateways_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "gateway_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"gateway_type" "gateway_type" NOT NULL,
	"external_transaction_id" varchar(255),
	"external_reference" varchar(255),
	"request_payload" jsonb,
	"response_payload" jsonb,
	"status" varchar(50) DEFAULT 'initiated' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 10 NOT NULL,
	"last_attempt_at" timestamp,
	"verified_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_number" varchar(100),
	"user_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency_id" uuid NOT NULL,
	"paid_amount" numeric(15, 2),
	"paid_currency_id" uuid,
	"exchange_rate" numeric(20, 8),
	"payment_method" "payment_method" NOT NULL,
	"payment_gateway_id" uuid,
	"payment_details" jsonb,
	"payment_date" date NOT NULL,
	"registered_at" timestamp DEFAULT now(),
	"status" "payment_status" DEFAULT 'completed',
	"receipt_url" text,
	"receipt_number" varchar(100),
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"registered_by" uuid,
	"verified_by" uuid,
	"verified_at" timestamp,
	"verification_notes" text,
	"billing_receipt_id" uuid,
	CONSTRAINT "payments_payment_number_unique" UNIQUE("payment_number")
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"parent_category_id" uuid,
	"is_active" boolean DEFAULT true,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid,
	"building_id" uuid,
	"expense_category_id" uuid,
	"description" text NOT NULL,
	"expense_date" date NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency_id" uuid NOT NULL,
	"vendor_name" varchar(255),
	"vendor_tax_id" varchar(100),
	"invoice_number" varchar(100),
	"invoice_url" text,
	"status" "expense_status" DEFAULT 'pending',
	"approved_by" uuid,
	"approved_at" timestamp,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_type" "document_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"condominium_id" uuid,
	"building_id" uuid,
	"unit_id" uuid,
	"user_id" uuid,
	"payment_id" uuid,
	"quota_id" uuid,
	"expense_id" uuid,
	"charge_id" uuid,
	"file_url" text NOT NULL,
	"file_name" varchar(255),
	"file_size" integer,
	"file_type" varchar(50),
	"document_date" date,
	"document_number" varchar(100),
	"is_public" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_type" "recipient_type" NOT NULL,
	"recipient_user_id" uuid,
	"recipient_condominium_id" uuid,
	"recipient_building_id" uuid,
	"recipient_unit_id" uuid,
	"subject" varchar(255),
	"body" text NOT NULL,
	"message_type" "message_type" DEFAULT 'message',
	"priority" "priority" DEFAULT 'normal',
	"attachments" jsonb,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"metadata" jsonb,
	"registered_by" uuid,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"status" "delivery_status" DEFAULT 'pending',
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"failed_at" timestamp,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"external_id" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" "notification_category" NOT NULL,
	"subject_template" varchar(500),
	"body_template" text NOT NULL,
	"variables" jsonb,
	"default_channels" jsonb DEFAULT '["in_app","push"]'::jsonb,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_templates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"template_id" uuid,
	"category" "notification_category" NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"priority" "priority" DEFAULT 'normal',
	"data" jsonb,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"expires_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_fcm_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(500) NOT NULL,
	"platform" "device_platform" NOT NULL,
	"device_name" varchar(255),
	"is_active" boolean DEFAULT true,
	"last_used_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "notification_category" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"quiet_hours_start" varchar(5),
	"quiet_hours_end" varchar(5),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"changed_fields" text[],
	"user_id" uuid,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"management_company_id" uuid NOT NULL,
	"token" varchar(128) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"status" "admin_invitation_status" DEFAULT 'pending' NOT NULL,
	"email" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"email_error" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "admin_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"condominium_id" uuid,
	"unit_id" uuid,
	"role_id" uuid NOT NULL,
	"token" varchar(128) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"status" "admin_invitation_status" DEFAULT 'pending' NOT NULL,
	"email" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"email_error" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "user_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "management_company_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"management_company_id" uuid NOT NULL,
	"subscription_name" varchar(100),
	"billing_cycle" "billing_cycle" NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"currency_id" uuid,
	"pricing_condominium_count" integer,
	"pricing_unit_count" integer,
	"pricing_condominium_rate" numeric(10, 2),
	"pricing_unit_rate" numeric(10, 4),
	"calculated_price" numeric(10, 2),
	"discount_type" "discount_type",
	"discount_value" numeric(10, 2),
	"discount_amount" numeric(10, 2),
	"pricing_notes" text,
	"rate_id" uuid,
	"max_condominiums" integer,
	"max_units" integer,
	"max_users" integer,
	"max_storage_gb" integer,
	"custom_features" jsonb,
	"custom_rules" jsonb,
	"status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"next_billing_date" timestamp,
	"trial_ends_at" timestamp,
	"auto_renew" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid,
	"updated_by" uuid,
	"cancelled_at" timestamp,
	"cancelled_by" uuid,
	"cancellation_reason" text
);
--> statement-breakpoint
CREATE TABLE "subscription_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"subscription_id" uuid NOT NULL,
	"management_company_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency_id" uuid,
	"tax_amount" numeric(10, 2) DEFAULT '0',
	"total_amount" numeric(10, 2) NOT NULL,
	"status" "invoice_status" DEFAULT 'pending' NOT NULL,
	"issue_date" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp NOT NULL,
	"paid_date" timestamp,
	"payment_id" uuid,
	"payment_method" varchar(50),
	"billing_period_start" timestamp NOT NULL,
	"billing_period_end" timestamp NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subscription_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "management_company_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"management_company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_name" "member_role" NOT NULL,
	"user_role_id" uuid,
	"permissions" jsonb,
	"is_primary_admin" boolean DEFAULT false,
	"joined_at" timestamp DEFAULT now(),
	"invited_at" timestamp,
	"invited_by" uuid,
	"is_active" boolean DEFAULT true,
	"deactivated_at" timestamp,
	"deactivated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscription_audit_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"action" "subscription_audit_action" NOT NULL,
	"previous_values" jsonb,
	"new_values" jsonb,
	"changed_fields" text[],
	"performed_by" uuid,
	"performed_at" timestamp DEFAULT now() NOT NULL,
	"reason" text,
	"ip_address" "inet",
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "subscription_terms_conditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"effective_from" timestamp NOT NULL,
	"effective_until" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"terms_conditions_id" uuid NOT NULL,
	"token" varchar(64) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"status" "acceptance_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_by" uuid,
	"accepted_at" timestamp,
	"acceptor_email" varchar(255),
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"condominium_rate" numeric(10, 2) NOT NULL,
	"unit_rate" numeric(10, 4) NOT NULL,
	"user_rate" numeric(10, 2) DEFAULT '0' NOT NULL,
	"annual_discount_percentage" numeric(5, 2) DEFAULT '15' NOT NULL,
	"min_condominiums" integer DEFAULT 1 NOT NULL,
	"max_condominiums" integer,
	"tax_rate" numeric(5, 4),
	"version" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"effective_from" timestamp NOT NULL,
	"effective_until" timestamp,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" varchar(50) NOT NULL,
	"management_company_id" uuid NOT NULL,
	"channel" "ticket_channel" NOT NULL,
	"condominium_id" uuid,
	"created_by_user_id" uuid NOT NULL,
	"created_by_member_id" uuid,
	"subject" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"priority" "ticket_priority" DEFAULT 'medium' NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"category" "ticket_category",
	"resolved_at" timestamp,
	"resolved_by" uuid,
	"solution" text,
	"closed_at" timestamp,
	"closed_by" uuid,
	"metadata" jsonb,
	"tags" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "support_tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "support_ticket_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"message" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"attachments" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_ticket_assignment_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"assigned_to" uuid NOT NULL,
	"assigned_by" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"unassigned_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "amenities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"location" varchar(255),
	"capacity" integer,
	"requires_approval" boolean DEFAULT false,
	"reservation_rules" jsonb,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "amenity_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amenity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"status" "reservation_status" DEFAULT 'pending',
	"notes" text,
	"rejection_reason" text,
	"approved_by" uuid,
	"approved_at" timestamp,
	"cancelled_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "condominium_access_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid NOT NULL,
	"code" varchar(8) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "condominium_access_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"access_code_id" uuid NOT NULL,
	"ownership_type" "ownership_type" NOT NULL,
	"status" "access_request_status" DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(20),
	"swift_code" varchar(11),
	"country" varchar(2) NOT NULL,
	"account_category" "bank_account_category" NOT NULL,
	"supported_payment_methods" "bank_payment_method"[],
	"logo_url" text,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"management_company_id" uuid NOT NULL,
	"bank_id" uuid,
	"account_category" "bank_account_category" NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"bank_name" varchar(255) NOT NULL,
	"account_holder_name" varchar(255) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"currency_id" uuid,
	"account_details" jsonb NOT NULL,
	"accepted_payment_methods" "bank_payment_method"[] NOT NULL,
	"applies_to_all_condominiums" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_by" uuid NOT NULL,
	"deactivated_by" uuid,
	"deactivated_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_account_condominiums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"condominium_id" uuid NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "condominium_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"provider_type" "service_provider_type" NOT NULL,
	"legal_name" varchar(255),
	"tax_id_type" varchar(5),
	"tax_id_number" varchar(50),
	"email" varchar(255),
	"phone_country_code" varchar(10),
	"phone" varchar(50),
	"address" varchar(500),
	"location_id" uuid,
	"charges_iva" boolean DEFAULT false NOT NULL,
	"iva_rate" numeric(5, 4) DEFAULT '0.16' NOT NULL,
	"subject_to_islr_retention" boolean DEFAULT false NOT NULL,
	"islr_retention_rate" numeric(5, 4) DEFAULT '0.01' NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"condominium_id" uuid NOT NULL,
	"payment_concept_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"execution_date" date,
	"execution_day" integer,
	"is_template" boolean DEFAULT false NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency_id" uuid NOT NULL,
	"invoice_number" varchar(100),
	"items" jsonb DEFAULT '[]'::jsonb,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "budget_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"expense_category_id" uuid,
	"description" varchar(255) NOT NULL,
	"budgeted_amount" numeric(15, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"budget_type" "budget_type" DEFAULT 'monthly' NOT NULL,
	"period_year" integer NOT NULL,
	"period_month" integer,
	"currency_id" uuid NOT NULL,
	"status" "budget_status" DEFAULT 'draft' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"reserve_fund_percentage" numeric(5, 2) DEFAULT '0',
	"approved_by" uuid,
	"approved_at" timestamp,
	"notes" text,
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_budgets_condo_period" UNIQUE("condominium_id","budget_type","period_year","period_month")
);
--> statement-breakpoint
CREATE TABLE "bank_statement_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"filename" varchar(255) NOT NULL,
	"imported_by" uuid,
	"period_from" date NOT NULL,
	"period_to" date NOT NULL,
	"total_entries" integer DEFAULT 0,
	"total_credits" numeric(15, 2) DEFAULT '0',
	"total_debits" numeric(15, 2) DEFAULT '0',
	"status" "bank_statement_import_status" DEFAULT 'processing',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_statement_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"transaction_date" date NOT NULL,
	"value_date" date,
	"reference" varchar(255),
	"description" text,
	"amount" numeric(15, 2) NOT NULL,
	"entry_type" "bank_statement_entry_type" NOT NULL,
	"balance" numeric(15, 2),
	"status" "bank_statement_entry_status" DEFAULT 'unmatched',
	"matched_at" timestamp,
	"raw_data" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"condominium_id" uuid NOT NULL,
	"period_from" date NOT NULL,
	"period_to" date NOT NULL,
	"status" "reconciliation_status" DEFAULT 'in_progress',
	"total_matched" integer DEFAULT 0,
	"total_unmatched" integer DEFAULT 0,
	"total_ignored" integer DEFAULT 0,
	"reconciled_by" uuid,
	"reconciled_at" timestamp,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_statement_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"match_type" "match_type" NOT NULL,
	"confidence" numeric(5, 2),
	"matched_by" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "event_log_category" NOT NULL,
	"level" "event_log_level" NOT NULL,
	"event" varchar(200) NOT NULL,
	"action" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"module" varchar(100),
	"condominium_id" uuid,
	"entity_type" varchar(100),
	"entity_id" uuid,
	"user_id" uuid,
	"user_role" varchar(50),
	"result" "event_log_result" NOT NULL,
	"error_code" varchar(50),
	"error_message" text,
	"metadata" jsonb,
	"duration_ms" integer,
	"source" "event_log_source" DEFAULT 'api' NOT NULL,
	"ip_address" "inet",
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wizard_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wizard_type" "wizard_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"last_modified_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "charge_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"category" charge_category NOT NULL,
	"is_auto_generated" boolean DEFAULT false,
	"is_recurring" boolean DEFAULT true,
	"default_amount" numeric(15, 2),
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid NOT NULL,
	"charge_type_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"receipt_id" uuid,
	"period_year" integer NOT NULL,
	"period_month" integer NOT NULL,
	"description" text,
	"amount" numeric(15, 2) NOT NULL,
	"is_credit" boolean DEFAULT false,
	"currency_id" uuid NOT NULL,
	"distribution_method" "distribution_method",
	"status" charge_status DEFAULT 'pending' NOT NULL,
	"paid_amount" numeric(15, 2) DEFAULT '0',
	"balance" numeric(15, 2) NOT NULL,
	"source_expense_id" uuid,
	"source_charge_id" uuid,
	"source_receipt_id" uuid,
	"is_auto_generated" boolean DEFAULT false,
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"period_year" integer NOT NULL,
	"period_month" integer NOT NULL,
	"receipt_number" varchar(50) NOT NULL,
	"status" "billing_receipt_status" DEFAULT 'draft' NOT NULL,
	"receipt_type" "receipt_type" DEFAULT 'original' NOT NULL,
	"issued_at" timestamp,
	"due_date" date,
	"parent_receipt_id" uuid,
	"subtotal" numeric(15, 2) DEFAULT '0',
	"reserve_fund_amount" numeric(15, 2) DEFAULT '0',
	"previous_balance" numeric(15, 2) DEFAULT '0',
	"interest_amount" numeric(15, 2) DEFAULT '0',
	"late_fee_amount" numeric(15, 2) DEFAULT '0',
	"discount_amount" numeric(15, 2) DEFAULT '0',
	"total_amount" numeric(15, 2) NOT NULL,
	"currency_id" uuid NOT NULL,
	"replaces_receipt_id" uuid,
	"void_reason" text,
	"assembly_minute_id" uuid,
	"budget_id" uuid,
	"pdf_url" text,
	"notes" text,
	"metadata" jsonb,
	"generated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "receipts_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE "unit_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"condominium_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"entry_type" "ledger_entry_type" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency_id" uuid NOT NULL,
	"running_balance" numeric(15, 2) NOT NULL,
	"description" text,
	"reference_type" "ledger_reference_type" NOT NULL,
	"reference_id" uuid NOT NULL,
	"payment_amount" numeric(15, 2),
	"payment_currency_id" uuid,
	"exchange_rate_id" uuid,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"charge_id" uuid NOT NULL,
	"allocated_amount" numeric(15, 2) NOT NULL,
	"allocated_at" timestamp DEFAULT now(),
	"reversed" boolean DEFAULT false,
	"reversed_at" timestamp,
	"created_by" uuid,
	CONSTRAINT "uq_payment_allocation" UNIQUE("payment_id","charge_id")
);
--> statement-breakpoint
CREATE TABLE "ownership_transfer_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"previous_owner_id" uuid NOT NULL,
	"new_owner_id" uuid NOT NULL,
	"transfer_date" date NOT NULL,
	"balance_snapshot" jsonb NOT NULL,
	"total_debt" numeric(15, 2) DEFAULT '0',
	"debt_currency_id" uuid,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assembly_minutes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"assembly_type" "assembly_type" NOT NULL,
	"assembly_date" date NOT NULL,
	"assembly_location" varchar(255),
	"quorum_percentage" numeric(5, 2),
	"attendees_count" integer,
	"total_units" integer,
	"agenda" text,
	"decisions" jsonb,
	"notes" text,
	"document_url" text,
	"document_file_name" varchar(255),
	"status" "assembly_minute_status" DEFAULT 'draft' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "condominium_board_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"position" "board_position" NOT NULL,
	"status" "board_member_status" DEFAULT 'active' NOT NULL,
	"elected_at" date NOT NULL,
	"term_ends_at" date,
	"assembly_minute_id" uuid,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "fk_locations_parent" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_from_currency_id_currencies_id_fk" FOREIGN KEY ("from_currency_id") REFERENCES "public"."currencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_to_currency_id_currencies_id_fk" FOREIGN KEY ("to_currency_id") REFERENCES "public"."currencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "fk_users_location" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "fk_users_preferred_currency" FOREIGN KEY ("preferred_currency_id") REFERENCES "public"."currencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_companies" ADD CONSTRAINT "management_companies_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_companies" ADD CONSTRAINT "management_companies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_companies" ADD CONSTRAINT "management_companies_preferred_currency_id_currencies_id_fk" FOREIGN KEY ("preferred_currency_id") REFERENCES "public"."currencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominiums" ADD CONSTRAINT "condominiums_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominiums" ADD CONSTRAINT "condominiums_default_currency_id_currencies_id_fk" FOREIGN KEY ("default_currency_id") REFERENCES "public"."currencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominiums" ADD CONSTRAINT "condominiums_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_management_companies" ADD CONSTRAINT "condominium_management_companies_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_management_companies" ADD CONSTRAINT "condominium_management_companies_management_company_id_management_companies_id_fk" FOREIGN KEY ("management_company_id") REFERENCES "public"."management_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_management_companies" ADD CONSTRAINT "condominium_management_companies_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_management_company_id_management_companies_id_fk" FOREIGN KEY ("management_company_id") REFERENCES "public"."management_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_ownerships" ADD CONSTRAINT "unit_ownerships_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_ownerships" ADD CONSTRAINT "unit_ownerships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interest_configurations" ADD CONSTRAINT "interest_configurations_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interest_configurations" ADD CONSTRAINT "interest_configurations_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interest_configurations" ADD CONSTRAINT "interest_configurations_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interest_configurations" ADD CONSTRAINT "interest_configurations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_payment_gateways" ADD CONSTRAINT "entity_payment_gateways_payment_gateway_id_payment_gateways_id_fk" FOREIGN KEY ("payment_gateway_id") REFERENCES "public"."payment_gateways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_payment_gateways" ADD CONSTRAINT "entity_payment_gateways_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_payment_gateways" ADD CONSTRAINT "entity_payment_gateways_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_payment_gateways" ADD CONSTRAINT "entity_payment_gateways_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_gateways" ADD CONSTRAINT "payment_gateways_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gateway_transactions" ADD CONSTRAINT "gateway_transactions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_paid_currency_id_currencies_id_fk" FOREIGN KEY ("paid_currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_gateway_id_payment_gateways_id_fk" FOREIGN KEY ("payment_gateway_id") REFERENCES "public"."payment_gateways"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "fk_expense_categories_parent" FOREIGN KEY ("parent_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_expense_category_id_expense_categories_id_fk" FOREIGN KEY ("expense_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_charge_id_charges_id_fk" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_condominium_id_condominiums_id_fk" FOREIGN KEY ("recipient_condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_building_id_buildings_id_fk" FOREIGN KEY ("recipient_building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_unit_id_units_id_fk" FOREIGN KEY ("recipient_unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_fcm_tokens" ADD CONSTRAINT "user_fcm_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_management_company_id_management_companies_id_fk" FOREIGN KEY ("management_company_id") REFERENCES "public"."management_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_company_subscriptions" ADD CONSTRAINT "management_company_subscriptions_management_company_id_management_companies_id_fk" FOREIGN KEY ("management_company_id") REFERENCES "public"."management_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_company_subscriptions" ADD CONSTRAINT "management_company_subscriptions_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_company_subscriptions" ADD CONSTRAINT "management_company_subscriptions_rate_id_subscription_rates_id_fk" FOREIGN KEY ("rate_id") REFERENCES "public"."subscription_rates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_company_subscriptions" ADD CONSTRAINT "management_company_subscriptions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_company_subscriptions" ADD CONSTRAINT "management_company_subscriptions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_company_subscriptions" ADD CONSTRAINT "management_company_subscriptions_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_management_company_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."management_company_subscriptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_management_company_id_management_companies_id_fk" FOREIGN KEY ("management_company_id") REFERENCES "public"."management_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_company_members" ADD CONSTRAINT "management_company_members_management_company_id_management_companies_id_fk" FOREIGN KEY ("management_company_id") REFERENCES "public"."management_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_company_members" ADD CONSTRAINT "management_company_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_company_members" ADD CONSTRAINT "management_company_members_user_role_id_user_roles_id_fk" FOREIGN KEY ("user_role_id") REFERENCES "public"."user_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_company_members" ADD CONSTRAINT "management_company_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_company_members" ADD CONSTRAINT "management_company_members_deactivated_by_users_id_fk" FOREIGN KEY ("deactivated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_audit_history" ADD CONSTRAINT "subscription_audit_history_subscription_id_management_company_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."management_company_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_audit_history" ADD CONSTRAINT "subscription_audit_history_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_terms_conditions" ADD CONSTRAINT "subscription_terms_conditions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_acceptances" ADD CONSTRAINT "subscription_acceptances_subscription_id_management_company_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."management_company_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_acceptances" ADD CONSTRAINT "subscription_acceptances_terms_conditions_id_subscription_terms_conditions_id_fk" FOREIGN KEY ("terms_conditions_id") REFERENCES "public"."subscription_terms_conditions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_acceptances" ADD CONSTRAINT "subscription_acceptances_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_rates" ADD CONSTRAINT "subscription_rates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_rates" ADD CONSTRAINT "subscription_rates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_management_company_id_management_companies_id_fk" FOREIGN KEY ("management_company_id") REFERENCES "public"."management_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_created_by_member_id_management_company_members_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."management_company_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_assignment_history" ADD CONSTRAINT "support_ticket_assignment_history_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_assignment_history" ADD CONSTRAINT "support_ticket_assignment_history_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_assignment_history" ADD CONSTRAINT "support_ticket_assignment_history_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "amenities" ADD CONSTRAINT "amenities_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "amenities" ADD CONSTRAINT "amenities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "amenity_reservations" ADD CONSTRAINT "amenity_reservations_amenity_id_amenities_id_fk" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "amenity_reservations" ADD CONSTRAINT "amenity_reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "amenity_reservations" ADD CONSTRAINT "amenity_reservations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_access_codes" ADD CONSTRAINT "condominium_access_codes_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_access_codes" ADD CONSTRAINT "condominium_access_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_access_code_id_condominium_access_codes_id_fk" FOREIGN KEY ("access_code_id") REFERENCES "public"."condominium_access_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_management_company_id_management_companies_id_fk" FOREIGN KEY ("management_company_id") REFERENCES "public"."management_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_bank_id_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_deactivated_by_users_id_fk" FOREIGN KEY ("deactivated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_account_condominiums" ADD CONSTRAINT "bank_account_condominiums_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_account_condominiums" ADD CONSTRAINT "bank_account_condominiums_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_account_condominiums" ADD CONSTRAINT "bank_account_condominiums_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_services" ADD CONSTRAINT "condominium_services_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_services" ADD CONSTRAINT "condominium_services_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_services" ADD CONSTRAINT "condominium_services_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_executions" ADD CONSTRAINT "service_executions_service_id_condominium_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."condominium_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_executions" ADD CONSTRAINT "service_executions_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_executions" ADD CONSTRAINT "service_executions_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_executions" ADD CONSTRAINT "service_executions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_expense_category_id_expense_categories_id_fk" FOREIGN KEY ("expense_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_imports" ADD CONSTRAINT "bank_statement_imports_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_imports" ADD CONSTRAINT "bank_statement_imports_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_entries" ADD CONSTRAINT "bank_statement_entries_import_id_bank_statement_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."bank_statement_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_reconciled_by_users_id_fk" FOREIGN KEY ("reconciled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_matches" ADD CONSTRAINT "bank_statement_matches_entry_id_bank_statement_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."bank_statement_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_matches" ADD CONSTRAINT "bank_statement_matches_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_matches" ADD CONSTRAINT "bank_statement_matches_matched_by_users_id_fk" FOREIGN KEY ("matched_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizard_drafts" ADD CONSTRAINT "wizard_drafts_last_modified_by_users_id_fk" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_types" ADD CONSTRAINT "charge_types_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_charge_type_id_charge_types_id_fk" FOREIGN KEY ("charge_type_id") REFERENCES "public"."charge_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_ledger_entries" ADD CONSTRAINT "unit_ledger_entries_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_ledger_entries" ADD CONSTRAINT "unit_ledger_entries_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_ledger_entries" ADD CONSTRAINT "unit_ledger_entries_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_ledger_entries" ADD CONSTRAINT "unit_ledger_entries_payment_currency_id_currencies_id_fk" FOREIGN KEY ("payment_currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_ledger_entries" ADD CONSTRAINT "unit_ledger_entries_exchange_rate_id_exchange_rates_id_fk" FOREIGN KEY ("exchange_rate_id") REFERENCES "public"."exchange_rates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_ledger_entries" ADD CONSTRAINT "unit_ledger_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_charge_id_charges_id_fk" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_transfer_snapshots" ADD CONSTRAINT "ownership_transfer_snapshots_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_transfer_snapshots" ADD CONSTRAINT "ownership_transfer_snapshots_previous_owner_id_users_id_fk" FOREIGN KEY ("previous_owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_transfer_snapshots" ADD CONSTRAINT "ownership_transfer_snapshots_new_owner_id_users_id_fk" FOREIGN KEY ("new_owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_transfer_snapshots" ADD CONSTRAINT "ownership_transfer_snapshots_debt_currency_id_currencies_id_fk" FOREIGN KEY ("debt_currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_transfer_snapshots" ADD CONSTRAINT "ownership_transfer_snapshots_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_minutes" ADD CONSTRAINT "assembly_minutes_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_minutes" ADD CONSTRAINT "assembly_minutes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_board_members" ADD CONSTRAINT "condominium_board_members_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_board_members" ADD CONSTRAINT "condominium_board_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_board_members" ADD CONSTRAINT "condominium_board_members_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_locations_type" ON "locations" USING btree ("location_type");--> statement-breakpoint
CREATE INDEX "idx_locations_parent" ON "locations" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_locations_code" ON "locations" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_locations_name" ON "locations" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_locations_active" ON "locations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_locations_registered_by" ON "locations" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_currencies_code" ON "currencies" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_currencies_active" ON "currencies" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_currencies_registered_by" ON "currencies" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_from" ON "exchange_rates" USING btree ("from_currency_id");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_to" ON "exchange_rates" USING btree ("to_currency_id");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_date" ON "exchange_rates" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_active" ON "exchange_rates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_created_by" ON "exchange_rates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_registered_by" ON "exchange_rates" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_users_firebase_uid" ON "users" USING btree ("firebase_uid");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_location" ON "users" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_users_active" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_users_id_document" ON "users" USING btree ("id_document_number");--> statement-breakpoint
CREATE INDEX "idx_permissions_module" ON "permissions" USING btree ("module");--> statement-breakpoint
CREATE INDEX "idx_permissions_registered_by" ON "permissions" USING btree ("registered_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_permissions_module_action" ON "permissions" USING btree ("module","action");--> statement-breakpoint
CREATE INDEX "idx_roles_name" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_roles_system" ON "roles" USING btree ("is_system_role");--> statement-breakpoint
CREATE INDEX "idx_roles_registered_by" ON "roles" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_role" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_permission" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_registered_by" ON "role_permissions" USING btree ("registered_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_role_permissions_unique" ON "role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE INDEX "idx_user_permissions_user" ON "user_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_permissions_permission" ON "user_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "idx_user_permissions_assigned_by" ON "user_permissions" USING btree ("assigned_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_permissions_unique" ON "user_permissions" USING btree ("user_id","permission_id");--> statement-breakpoint
CREATE INDEX "idx_management_companies_name" ON "management_companies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_management_companies_tax_id_number" ON "management_companies" USING btree ("tax_id_number");--> statement-breakpoint
CREATE INDEX "idx_management_companies_active" ON "management_companies" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_management_companies_created_by" ON "management_companies" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_condominiums_name" ON "condominiums" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_condominiums_code" ON "condominiums" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_condominiums_location" ON "condominiums" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_condominiums_active" ON "condominiums" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_condominiums_created_by" ON "condominiums" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_condo_mgmt_condominium" ON "condominium_management_companies" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_condo_mgmt_company" ON "condominium_management_companies" USING btree ("management_company_id");--> statement-breakpoint
CREATE INDEX "idx_condo_mgmt_assigned_by" ON "condominium_management_companies" USING btree ("assigned_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_condo_mgmt_unique" ON "condominium_management_companies" USING btree ("condominium_id","management_company_id");--> statement-breakpoint
CREATE INDEX "idx_buildings_condominium" ON "buildings" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_buildings_name" ON "buildings" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_buildings_active" ON "buildings" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_buildings_created_by" ON "buildings" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_buildings_code_unique" ON "buildings" USING btree ("condominium_id","code");--> statement-breakpoint
CREATE INDEX "idx_user_roles_user" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_role" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_condominium" ON "user_roles" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_building" ON "user_roles" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_assigned_by" ON "user_roles" USING btree ("assigned_by");--> statement-breakpoint
CREATE INDEX "idx_user_roles_registered_by" ON "user_roles" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_user_roles_active" ON "user_roles" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_user_roles_management_company" ON "user_roles" USING btree ("management_company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_roles_unique" ON "user_roles" USING btree ("user_id","role_id","condominium_id","building_id","management_company_id");--> statement-breakpoint
CREATE INDEX "idx_units_building" ON "units" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "idx_units_number" ON "units" USING btree ("unit_number");--> statement-breakpoint
CREATE INDEX "idx_units_active" ON "units" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_units_created_by" ON "units" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_units_unique" ON "units" USING btree ("building_id","unit_number");--> statement-breakpoint
CREATE INDEX "idx_unit_ownerships_unit" ON "unit_ownerships" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_unit_ownerships_user" ON "unit_ownerships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_unit_ownerships_type" ON "unit_ownerships" USING btree ("ownership_type");--> statement-breakpoint
CREATE INDEX "idx_unit_ownerships_active" ON "unit_ownerships" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_unit_ownerships_registered" ON "unit_ownerships" USING btree ("is_registered");--> statement-breakpoint
CREATE INDEX "idx_interest_configs_condominium" ON "interest_configurations" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_interest_configs_building" ON "interest_configurations" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "idx_interest_configs_concept" ON "interest_configurations" USING btree ("payment_concept_id");--> statement-breakpoint
CREATE INDEX "idx_interest_configs_active" ON "interest_configurations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_interest_configs_dates" ON "interest_configurations" USING btree ("effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "idx_interest_configs_created_by" ON "interest_configurations" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_entity_gateways_gateway" ON "entity_payment_gateways" USING btree ("payment_gateway_id");--> statement-breakpoint
CREATE INDEX "idx_entity_gateways_condominium" ON "entity_payment_gateways" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_entity_gateways_building" ON "entity_payment_gateways" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "idx_entity_gateways_registered_by" ON "entity_payment_gateways" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_payment_gateways_type" ON "payment_gateways" USING btree ("gateway_type");--> statement-breakpoint
CREATE INDEX "idx_payment_gateways_active" ON "payment_gateways" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_payment_gateways_registered_by" ON "payment_gateways" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_gateway_tx_payment" ON "gateway_transactions" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_gateway_tx_external_id" ON "gateway_transactions" USING btree ("external_transaction_id");--> statement-breakpoint
CREATE INDEX "idx_gateway_tx_external_ref" ON "gateway_transactions" USING btree ("external_reference");--> statement-breakpoint
CREATE INDEX "idx_gateway_tx_status" ON "gateway_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_gateway_tx_type" ON "gateway_transactions" USING btree ("gateway_type");--> statement-breakpoint
CREATE INDEX "idx_payments_user" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_payments_unit" ON "payments" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_payments_date" ON "payments" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payments_number" ON "payments" USING btree ("payment_number");--> statement-breakpoint
CREATE INDEX "idx_payments_gateway" ON "payments" USING btree ("payment_gateway_id");--> statement-breakpoint
CREATE INDEX "idx_payments_currency" ON "payments" USING btree ("currency_id");--> statement-breakpoint
CREATE INDEX "idx_payments_registered_by" ON "payments" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_payments_verified_by" ON "payments" USING btree ("verified_by");--> statement-breakpoint
CREATE INDEX "idx_expense_categories_parent" ON "expense_categories" USING btree ("parent_category_id");--> statement-breakpoint
CREATE INDEX "idx_expense_categories_active" ON "expense_categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_expense_categories_registered_by" ON "expense_categories" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_expenses_condominium" ON "expenses" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_building" ON "expenses" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_category" ON "expenses" USING btree ("expense_category_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_date" ON "expenses" USING btree ("expense_date");--> statement-breakpoint
CREATE INDEX "idx_expenses_status" ON "expenses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_expenses_created_by" ON "expenses" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_documents_type" ON "documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "idx_documents_condominium" ON "documents" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_documents_building" ON "documents" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "idx_documents_unit" ON "documents" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_documents_payment" ON "documents" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_documents_user" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_documents_date" ON "documents" USING btree ("document_date");--> statement-breakpoint
CREATE INDEX "idx_documents_charge" ON "documents" USING btree ("charge_id");--> statement-breakpoint
CREATE INDEX "idx_documents_created_by" ON "documents" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_messages_sender" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_messages_recipient_user" ON "messages" USING btree ("recipient_user_id");--> statement-breakpoint
CREATE INDEX "idx_messages_recipient_condominium" ON "messages" USING btree ("recipient_condominium_id");--> statement-breakpoint
CREATE INDEX "idx_messages_recipient_building" ON "messages" USING btree ("recipient_building_id");--> statement-breakpoint
CREATE INDEX "idx_messages_recipient_unit" ON "messages" USING btree ("recipient_unit_id");--> statement-breakpoint
CREATE INDEX "idx_messages_type" ON "messages" USING btree ("message_type");--> statement-breakpoint
CREATE INDEX "idx_messages_read" ON "messages" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_messages_sent" ON "messages" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "idx_messages_registered_by" ON "messages" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_notification_deliveries_notification" ON "notification_deliveries" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "idx_notification_deliveries_channel" ON "notification_deliveries" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "idx_notification_deliveries_status" ON "notification_deliveries" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_notification_deliveries_unique" ON "notification_deliveries" USING btree ("notification_id","channel");--> statement-breakpoint
CREATE INDEX "idx_notification_templates_code" ON "notification_templates" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_notification_templates_category" ON "notification_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_notification_templates_active" ON "notification_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_notification_templates_created_by" ON "notification_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_template" ON "notifications" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_category" ON "notifications" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_notifications_read" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_created" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_user_fcm_tokens_user" ON "user_fcm_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_fcm_tokens_token" ON "user_fcm_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_user_fcm_tokens_active" ON "user_fcm_tokens" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_fcm_tokens_unique" ON "user_fcm_tokens" USING btree ("user_id","token");--> statement-breakpoint
CREATE INDEX "idx_user_notification_prefs_user" ON "user_notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_notification_prefs_category" ON "user_notification_preferences" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_user_notification_prefs_channel" ON "user_notification_preferences" USING btree ("channel");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_notification_prefs_unique" ON "user_notification_preferences" USING btree ("user_id","category","channel");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_table" ON "audit_logs" USING btree ("table_name");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_record" ON "audit_logs" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_admin_invitations_user" ON "admin_invitations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_admin_invitations_company" ON "admin_invitations" USING btree ("management_company_id");--> statement-breakpoint
CREATE INDEX "idx_admin_invitations_token" ON "admin_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_admin_invitations_token_hash" ON "admin_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_admin_invitations_status" ON "admin_invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_admin_invitations_email" ON "admin_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_admin_invitations_expires" ON "admin_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_user_invitations_user" ON "user_invitations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_invitations_condominium" ON "user_invitations" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_user_invitations_unit" ON "user_invitations" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_user_invitations_role" ON "user_invitations" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_user_invitations_token" ON "user_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_user_invitations_token_hash" ON "user_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_user_invitations_status" ON "user_invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_user_invitations_email" ON "user_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_user_invitations_expires" ON "user_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_company" ON "management_company_subscriptions" USING btree ("management_company_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_status" ON "management_company_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_next_billing" ON "management_company_subscriptions" USING btree ("next_billing_date");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_created_by" ON "management_company_subscriptions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_rate" ON "management_company_subscriptions" USING btree ("rate_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_subscription" ON "subscription_invoices" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_company" ON "subscription_invoices" USING btree ("management_company_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_status" ON "subscription_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_invoices_due_date" ON "subscription_invoices" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_invoices_number" ON "subscription_invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "idx_invoices_payment" ON "subscription_invoices" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_members_company" ON "management_company_members" USING btree ("management_company_id");--> statement-breakpoint
CREATE INDEX "idx_members_user" ON "management_company_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_members_role" ON "management_company_members" USING btree ("role_name");--> statement-breakpoint
CREATE INDEX "idx_members_primary" ON "management_company_members" USING btree ("is_primary_admin");--> statement-breakpoint
CREATE INDEX "idx_members_invited_by" ON "management_company_members" USING btree ("invited_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_members_unique" ON "management_company_members" USING btree ("management_company_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_subscription_audit_subscription" ON "subscription_audit_history" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "idx_subscription_audit_action" ON "subscription_audit_history" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_subscription_audit_performed_by" ON "subscription_audit_history" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "idx_subscription_audit_performed_at" ON "subscription_audit_history" USING btree ("performed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_terms_version_unique" ON "subscription_terms_conditions" USING btree ("version");--> statement-breakpoint
CREATE INDEX "idx_terms_active" ON "subscription_terms_conditions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_terms_effective_from" ON "subscription_terms_conditions" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "idx_acceptance_subscription" ON "subscription_acceptances" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "idx_acceptance_status" ON "subscription_acceptances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_acceptance_expires_at" ON "subscription_acceptances" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_acceptance_token_hash" ON "subscription_acceptances" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_rates_version" ON "subscription_rates" USING btree ("version");--> statement-breakpoint
CREATE INDEX "idx_rates_active" ON "subscription_rates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_rates_effective_from" ON "subscription_rates" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "idx_rates_name" ON "subscription_rates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_rates_tier" ON "subscription_rates" USING btree ("min_condominiums","max_condominiums");--> statement-breakpoint
CREATE INDEX "idx_tickets_company" ON "support_tickets" USING btree ("management_company_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_created_by" ON "support_tickets" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_status" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tickets_priority" ON "support_tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_tickets_number" ON "support_tickets" USING btree ("ticket_number");--> statement-breakpoint
CREATE INDEX "idx_tickets_created_at" ON "support_tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_tickets_channel" ON "support_tickets" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "idx_tickets_condominium" ON "support_tickets" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_messages_ticket" ON "support_ticket_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_messages_user" ON "support_ticket_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_messages_created_at" ON "support_ticket_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_amenities_condominium" ON "amenities" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_amenities_name" ON "amenities" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_amenities_active" ON "amenities" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_amenities_created_by" ON "amenities" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_amenity_reservations_amenity" ON "amenity_reservations" USING btree ("amenity_id");--> statement-breakpoint
CREATE INDEX "idx_amenity_reservations_user" ON "amenity_reservations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_amenity_reservations_status" ON "amenity_reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_amenity_reservations_start_time" ON "amenity_reservations" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "idx_amenity_reservations_end_time" ON "amenity_reservations" USING btree ("end_time");--> statement-breakpoint
CREATE INDEX "idx_access_codes_condominium" ON "condominium_access_codes" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_access_codes_code" ON "condominium_access_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_access_codes_active" ON "condominium_access_codes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_access_codes_expires" ON "condominium_access_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_access_requests_condominium" ON "access_requests" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_access_requests_unit" ON "access_requests" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_access_requests_user" ON "access_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_access_requests_access_code" ON "access_requests" USING btree ("access_code_id");--> statement-breakpoint
CREATE INDEX "idx_access_requests_status" ON "access_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_banks_country" ON "banks" USING btree ("country");--> statement-breakpoint
CREATE INDEX "idx_banks_account_category" ON "banks" USING btree ("account_category");--> statement-breakpoint
CREATE INDEX "idx_banks_active" ON "banks" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_banks_code" ON "banks" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_banks_code_country" ON "banks" USING btree ("code","country");--> statement-breakpoint
CREATE INDEX "idx_bank_accounts_management_company" ON "bank_accounts" USING btree ("management_company_id");--> statement-breakpoint
CREATE INDEX "idx_bank_accounts_bank" ON "bank_accounts" USING btree ("bank_id");--> statement-breakpoint
CREATE INDEX "idx_bank_accounts_category" ON "bank_accounts" USING btree ("account_category");--> statement-breakpoint
CREATE INDEX "idx_bank_accounts_active" ON "bank_accounts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_bank_accounts_created_by" ON "bank_accounts" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_bank_accounts_currency_id" ON "bank_accounts" USING btree ("currency_id");--> statement-breakpoint
CREATE INDEX "idx_bank_account_condo_bank_account" ON "bank_account_condominiums" USING btree ("bank_account_id");--> statement-breakpoint
CREATE INDEX "idx_bank_account_condo_condominium" ON "bank_account_condominiums" USING btree ("condominium_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bank_account_condo_unique" ON "bank_account_condominiums" USING btree ("bank_account_id","condominium_id");--> statement-breakpoint
CREATE INDEX "idx_condominium_services_condominium" ON "condominium_services" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_condominium_services_provider_type" ON "condominium_services" USING btree ("provider_type");--> statement-breakpoint
CREATE INDEX "idx_condominium_services_active" ON "condominium_services" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_condominium_services_created_by" ON "condominium_services" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_service_executions_service" ON "service_executions" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "idx_service_executions_condominium" ON "service_executions" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_service_executions_concept" ON "service_executions" USING btree ("payment_concept_id");--> statement-breakpoint
CREATE INDEX "idx_service_executions_date" ON "service_executions" USING btree ("execution_date");--> statement-breakpoint
CREATE INDEX "idx_budget_items_budget" ON "budget_items" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "idx_budget_items_category" ON "budget_items" USING btree ("expense_category_id");--> statement-breakpoint
CREATE INDEX "idx_budgets_condominium" ON "budgets" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_budgets_status" ON "budgets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_budgets_period" ON "budgets" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_imports_bank_account" ON "bank_statement_imports" USING btree ("bank_account_id");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_imports_status" ON "bank_statement_imports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_imports_imported_by" ON "bank_statement_imports" USING btree ("imported_by");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_imports_period" ON "bank_statement_imports" USING btree ("period_from","period_to");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_entries_import" ON "bank_statement_entries" USING btree ("import_id");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_entries_date" ON "bank_statement_entries" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_entries_reference" ON "bank_statement_entries" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_entries_status" ON "bank_statement_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_entries_type" ON "bank_statement_entries" USING btree ("entry_type");--> statement-breakpoint
CREATE INDEX "idx_bank_reconciliations_bank_account" ON "bank_reconciliations" USING btree ("bank_account_id");--> statement-breakpoint
CREATE INDEX "idx_bank_reconciliations_condominium" ON "bank_reconciliations" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_bank_reconciliations_status" ON "bank_reconciliations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bank_reconciliations_period" ON "bank_reconciliations" USING btree ("period_from","period_to");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bank_statement_matches_entry_unique" ON "bank_statement_matches" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_matches_payment" ON "bank_statement_matches" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_matches_type" ON "bank_statement_matches" USING btree ("match_type");--> statement-breakpoint
CREATE INDEX "idx_event_logs_category" ON "event_logs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_event_logs_level" ON "event_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_event_logs_event" ON "event_logs" USING btree ("event");--> statement-breakpoint
CREATE INDEX "idx_event_logs_condominium" ON "event_logs" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_event_logs_entity" ON "event_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_event_logs_user" ON "event_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_event_logs_result" ON "event_logs" USING btree ("result");--> statement-breakpoint
CREATE INDEX "idx_event_logs_source" ON "event_logs" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_event_logs_created" ON "event_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_wizard_drafts_type_entity" ON "wizard_drafts" USING btree ("wizard_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_wizard_drafts_entity" ON "wizard_drafts" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "idx_charge_types_condominium" ON "charge_types" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_charge_types_category" ON "charge_types" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_charge_types_active" ON "charge_types" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_charges_condominium" ON "charges" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_charges_unit" ON "charges" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_charges_receipt" ON "charges" USING btree ("receipt_id");--> statement-breakpoint
CREATE INDEX "idx_charges_period" ON "charges" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "idx_charges_status" ON "charges" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_charges_charge_type" ON "charges" USING btree ("charge_type_id");--> statement-breakpoint
CREATE INDEX "idx_charges_created_by" ON "charges" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_billing_receipts_condominium" ON "receipts" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_billing_receipts_unit" ON "receipts" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_billing_receipts_period" ON "receipts" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "idx_billing_receipts_status" ON "receipts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_billing_receipts_generated_by" ON "receipts" USING btree ("generated_by");--> statement-breakpoint
CREATE INDEX "idx_ledger_unit_condo_date" ON "unit_ledger_entries" USING btree ("unit_id","condominium_id","entry_date");--> statement-breakpoint
CREATE INDEX "idx_ledger_unit_condo_created" ON "unit_ledger_entries" USING btree ("unit_id","condominium_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_ledger_reference" ON "unit_ledger_entries" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "idx_payment_allocations_payment" ON "payment_allocations" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_payment_allocations_charge" ON "payment_allocations" USING btree ("charge_id");--> statement-breakpoint
CREATE INDEX "idx_transfer_snapshots_unit" ON "ownership_transfer_snapshots" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_transfer_snapshots_date" ON "ownership_transfer_snapshots" USING btree ("transfer_date");--> statement-breakpoint
CREATE INDEX "idx_assembly_minutes_condominium" ON "assembly_minutes" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_assembly_minutes_date" ON "assembly_minutes" USING btree ("assembly_date");--> statement-breakpoint
CREATE INDEX "idx_assembly_minutes_status" ON "assembly_minutes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_assembly_minutes_type" ON "assembly_minutes" USING btree ("assembly_type");--> statement-breakpoint
CREATE INDEX "idx_board_members_condominium" ON "condominium_board_members" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_board_members_user" ON "condominium_board_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_board_members_status" ON "condominium_board_members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_board_members_position" ON "condominium_board_members" USING btree ("position");