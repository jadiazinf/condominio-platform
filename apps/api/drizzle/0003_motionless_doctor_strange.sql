CREATE TYPE "public"."acceptance_status" AS ENUM('pending', 'accepted', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."access_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."admin_invitation_status" AS ENUM('pending', 'accepted', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."assignment_scope" AS ENUM('condominium', 'building', 'unit');--> statement-breakpoint
CREATE TYPE "public"."bank_account_category" AS ENUM('national', 'international');--> statement-breakpoint
CREATE TYPE "public"."bank_payment_method" AS ENUM('transfer', 'pago_movil', 'interbancario', 'wire_transfer', 'ach', 'zelle', 'paypal', 'wise', 'crypto', 'other');--> statement-breakpoint
CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'quarterly', 'semi_annual', 'annual', 'custom');--> statement-breakpoint
CREATE TYPE "public"."charge_adjustment_type" AS ENUM('percentage', 'fixed', 'none');--> statement-breakpoint
CREATE TYPE "public"."charge_generation_strategy" AS ENUM('auto', 'bulk', 'manual');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'delivered', 'failed', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('web', 'ios', 'android');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."distribution_method" AS ENUM('by_aliquot', 'equal_split', 'fixed_per_unit');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('admin', 'accountant', 'support', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."notification_category" AS ENUM('payment', 'quota', 'announcement', 'reminder', 'alert', 'system');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email', 'push');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."service_provider_type" AS ENUM('individual', 'company', 'cooperative', 'government', 'internal');--> statement-breakpoint
CREATE TYPE "public"."subscription_audit_action" AS ENUM('created', 'activated', 'deactivated', 'updated', 'cancelled', 'renewed', 'terms_accepted', 'price_changed');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trial', 'active', 'inactive', 'cancelled', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."ticket_category" AS ENUM('technical', 'billing', 'feature_request', 'general', 'bug');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ve_account_type" AS ENUM('corriente', 'ahorro', 'divisas');--> statement-breakpoint
ALTER TYPE "public"."concept_type" ADD VALUE 'reserve_fund';--> statement-breakpoint
ALTER TYPE "public"."concept_type" ADD VALUE 'other';--> statement-breakpoint
ALTER TYPE "public"."generation_method" ADD VALUE 'bulk';--> statement-breakpoint
ALTER TYPE "public"."ownership_type" ADD VALUE 'family_member';--> statement-breakpoint
ALTER TYPE "public"."ownership_type" ADD VALUE 'authorized';--> statement-breakpoint
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
CREATE TABLE "payment_concept_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_concept_id" uuid NOT NULL,
	"scope_type" "assignment_scope" NOT NULL,
	"condominium_id" uuid NOT NULL,
	"building_id" uuid,
	"unit_id" uuid,
	"distribution_method" "distribution_method" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"is_active" boolean DEFAULT true,
	"assigned_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_concept_bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_concept_id" uuid NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"assigned_by" uuid,
	"created_at" timestamp DEFAULT now()
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
	"default_channels" jsonb DEFAULT '["in_app"]'::jsonb,
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
	"execution_date" date NOT NULL,
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
CREATE TABLE "payment_concept_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_concept_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"use_default_amount" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "management_companies" DROP CONSTRAINT "management_companies_tax_id_unique";--> statement-breakpoint
ALTER TABLE "condominiums" DROP CONSTRAINT "condominiums_management_company_id_management_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_pending_allocations" DROP CONSTRAINT "payment_pending_allocations_payment_id_payments_id_fk";
--> statement-breakpoint
DROP INDEX "idx_condominiums_management_company";--> statement-breakpoint
DROP INDEX "idx_exchange_rates_unique";--> statement-breakpoint
DROP INDEX "idx_management_companies_tax_id";--> statement-breakpoint
DROP INDEX "idx_user_roles_unique";--> statement-breakpoint
ALTER TABLE "management_companies" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "unit_ownerships" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "condominiums" ADD COLUMN "phone_country_code" varchar(10);--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "management_companies" ADD COLUMN "tax_id_type" varchar(5);--> statement-breakpoint
ALTER TABLE "management_companies" ADD COLUMN "tax_id_number" varchar(50);--> statement-breakpoint
ALTER TABLE "management_companies" ADD COLUMN "phone_country_code" varchar(10);--> statement-breakpoint
ALTER TABLE "payment_concepts" ADD COLUMN "charge_generation_strategy" charge_generation_strategy DEFAULT 'auto';--> statement-breakpoint
ALTER TABLE "payment_concepts" ADD COLUMN "allows_partial_payment" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "payment_concepts" ADD COLUMN "late_payment_type" charge_adjustment_type DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "payment_concepts" ADD COLUMN "late_payment_value" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "payment_concepts" ADD COLUMN "late_payment_grace_days" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "payment_concepts" ADD COLUMN "early_payment_type" charge_adjustment_type DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "payment_concepts" ADD COLUMN "early_payment_value" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "payment_concepts" ADD COLUMN "early_payment_days_before_due" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "payment_concepts" ADD COLUMN "issue_day" integer;--> statement-breakpoint
ALTER TABLE "payment_concepts" ADD COLUMN "due_day" integer;--> statement-breakpoint
ALTER TABLE "payment_concepts" ADD COLUMN "effective_from" timestamp;--> statement-breakpoint
ALTER TABLE "payment_concepts" ADD COLUMN "effective_until" timestamp;--> statement-breakpoint
ALTER TABLE "unit_ownerships" ADD COLUMN "full_name" varchar(255);--> statement-breakpoint
ALTER TABLE "unit_ownerships" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "unit_ownerships" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "unit_ownerships" ADD COLUMN "phone_country_code" varchar(10);--> statement-breakpoint
ALTER TABLE "unit_ownerships" ADD COLUMN "id_document_type" varchar(50);--> statement-breakpoint
ALTER TABLE "unit_ownerships" ADD COLUMN "id_document_number" varchar(50);--> statement-breakpoint
ALTER TABLE "unit_ownerships" ADD COLUMN "is_registered" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "management_company_id" uuid;--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_country_code" varchar(10);--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_management_companies" ADD CONSTRAINT "condominium_management_companies_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_management_companies" ADD CONSTRAINT "condominium_management_companies_management_company_id_management_companies_id_fk" FOREIGN KEY ("management_company_id") REFERENCES "public"."management_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_management_companies" ADD CONSTRAINT "condominium_management_companies_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_concept_assignments" ADD CONSTRAINT "payment_concept_assignments_payment_concept_id_payment_concepts_id_fk" FOREIGN KEY ("payment_concept_id") REFERENCES "public"."payment_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_concept_assignments" ADD CONSTRAINT "payment_concept_assignments_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_concept_assignments" ADD CONSTRAINT "payment_concept_assignments_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_concept_assignments" ADD CONSTRAINT "payment_concept_assignments_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_concept_assignments" ADD CONSTRAINT "payment_concept_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_concept_bank_accounts" ADD CONSTRAINT "payment_concept_bank_accounts_payment_concept_id_payment_concepts_id_fk" FOREIGN KEY ("payment_concept_id") REFERENCES "public"."payment_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_concept_bank_accounts" ADD CONSTRAINT "payment_concept_bank_accounts_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_concept_bank_accounts" ADD CONSTRAINT "payment_concept_bank_accounts_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_fcm_tokens" ADD CONSTRAINT "user_fcm_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "service_executions" ADD CONSTRAINT "service_executions_payment_concept_id_payment_concepts_id_fk" FOREIGN KEY ("payment_concept_id") REFERENCES "public"."payment_concepts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_executions" ADD CONSTRAINT "service_executions_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_executions" ADD CONSTRAINT "service_executions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_concept_services" ADD CONSTRAINT "payment_concept_services_payment_concept_id_payment_concepts_id_fk" FOREIGN KEY ("payment_concept_id") REFERENCES "public"."payment_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_concept_services" ADD CONSTRAINT "payment_concept_services_service_id_condominium_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."condominium_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_permissions_user" ON "user_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_permissions_permission" ON "user_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "idx_user_permissions_assigned_by" ON "user_permissions" USING btree ("assigned_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_permissions_unique" ON "user_permissions" USING btree ("user_id","permission_id");--> statement-breakpoint
CREATE INDEX "idx_condo_mgmt_condominium" ON "condominium_management_companies" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_condo_mgmt_company" ON "condominium_management_companies" USING btree ("management_company_id");--> statement-breakpoint
CREATE INDEX "idx_condo_mgmt_assigned_by" ON "condominium_management_companies" USING btree ("assigned_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_condo_mgmt_unique" ON "condominium_management_companies" USING btree ("condominium_id","management_company_id");--> statement-breakpoint
CREATE INDEX "idx_pca_concept" ON "payment_concept_assignments" USING btree ("payment_concept_id");--> statement-breakpoint
CREATE INDEX "idx_pca_scope" ON "payment_concept_assignments" USING btree ("scope_type");--> statement-breakpoint
CREATE INDEX "idx_pca_condominium" ON "payment_concept_assignments" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_pca_building" ON "payment_concept_assignments" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "idx_pca_unit" ON "payment_concept_assignments" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_pca_active" ON "payment_concept_assignments" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pca_unique_assignment" ON "payment_concept_assignments" USING btree ("payment_concept_id","scope_type","building_id","unit_id");--> statement-breakpoint
CREATE INDEX "idx_pcba_concept" ON "payment_concept_bank_accounts" USING btree ("payment_concept_id");--> statement-breakpoint
CREATE INDEX "idx_pcba_bank_account" ON "payment_concept_bank_accounts" USING btree ("bank_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pcba_unique_link" ON "payment_concept_bank_accounts" USING btree ("payment_concept_id","bank_account_id");--> statement-breakpoint
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
CREATE INDEX "idx_pcs_concept" ON "payment_concept_services" USING btree ("payment_concept_id");--> statement-breakpoint
CREATE INDEX "idx_pcs_service" ON "payment_concept_services" USING btree ("service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pcs_unique_concept_service" ON "payment_concept_services" USING btree ("payment_concept_id","service_id");--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_management_company_id_management_companies_id_fk" FOREIGN KEY ("management_company_id") REFERENCES "public"."management_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_active" ON "exchange_rates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_management_companies_tax_id_number" ON "management_companies" USING btree ("tax_id_number");--> statement-breakpoint
CREATE INDEX "idx_unit_ownerships_registered" ON "unit_ownerships" USING btree ("is_registered");--> statement-breakpoint
CREATE INDEX "idx_user_roles_active" ON "user_roles" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_user_roles_management_company" ON "user_roles" USING btree ("management_company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_roles_unique" ON "user_roles" USING btree ("user_id","role_id","condominium_id","building_id","management_company_id");--> statement-breakpoint
ALTER TABLE "condominiums" DROP COLUMN "management_company_id";--> statement-breakpoint
ALTER TABLE "management_companies" DROP COLUMN "tax_id";--> statement-breakpoint
ALTER TABLE "management_companies" ADD CONSTRAINT "management_companies_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "unit_ownerships" ADD CONSTRAINT "chk_unregistered_contact" CHECK ("unit_ownerships"."user_id" IS NOT NULL OR ("unit_ownerships"."full_name" IS NOT NULL AND ("unit_ownerships"."email" IS NOT NULL OR "unit_ownerships"."phone" IS NOT NULL)));