CREATE TYPE "public"."ticket_channel" AS ENUM('resident_to_admin', 'resident_to_support', 'admin_to_support');--> statement-breakpoint
CREATE TYPE "public"."wizard_type" AS ENUM('payment_concept');--> statement-breakpoint
ALTER TYPE "public"."allocation_status" ADD VALUE 'refund_pending';--> statement-breakpoint
ALTER TYPE "public"."allocation_status" ADD VALUE 'refund_failed';--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'mobile_payment' BEFORE 'gateway';--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'other';--> statement-breakpoint
ALTER TYPE "public"."quota_status" ADD VALUE 'partial' BEFORE 'paid';--> statement-breakpoint
ALTER TYPE "public"."ticket_category" ADD VALUE 'maintenance';--> statement-breakpoint
ALTER TYPE "public"."ticket_category" ADD VALUE 'payment_issue';--> statement-breakpoint
ALTER TYPE "public"."ticket_category" ADD VALUE 'access_request';--> statement-breakpoint
ALTER TYPE "public"."ticket_category" ADD VALUE 'noise_complaint';--> statement-breakpoint
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
ALTER TABLE "quota_adjustments" DROP CONSTRAINT "check_amount_changed";--> statement-breakpoint
ALTER TABLE "quotas" ALTER COLUMN "period_month" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "service_executions" ALTER COLUMN "execution_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "quota_adjustments" ADD COLUMN "tag" text;--> statement-breakpoint
ALTER TABLE "quotas" ADD COLUMN "adjustments_total" numeric(15, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "channel" "ticket_channel" NOT NULL;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "condominium_id" uuid;--> statement-breakpoint
ALTER TABLE "service_executions" ADD COLUMN "execution_day" integer;--> statement-breakpoint
ALTER TABLE "service_executions" ADD COLUMN "is_template" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "wizard_drafts" ADD CONSTRAINT "wizard_drafts_last_modified_by_users_id_fk" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_wizard_drafts_type_entity" ON "wizard_drafts" USING btree ("wizard_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_wizard_drafts_entity" ON "wizard_drafts" USING btree ("entity_id");--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_quotas_unique_period" ON "quotas" USING btree ("unit_id","payment_concept_id","period_year","period_month");--> statement-breakpoint
CREATE INDEX "idx_tickets_channel" ON "support_tickets" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "idx_tickets_condominium" ON "support_tickets" USING btree ("condominium_id");