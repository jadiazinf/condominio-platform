CREATE TYPE "public"."event_log_category" AS ENUM('payment', 'quota', 'reconciliation', 'worker', 'notification', 'gateway', 'auth', 'subscription', 'receipt', 'system');--> statement-breakpoint
CREATE TYPE "public"."event_log_level" AS ENUM('info', 'warn', 'error', 'critical');--> statement-breakpoint
CREATE TYPE "public"."event_log_result" AS ENUM('success', 'failure', 'partial');--> statement-breakpoint
CREATE TYPE "public"."event_log_source" AS ENUM('api', 'worker', 'webhook', 'cron', 'system');--> statement-breakpoint
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
ALTER TABLE "notification_templates" ALTER COLUMN "default_channels" SET DEFAULT '["in_app","push"]'::jsonb;--> statement-breakpoint
ALTER TABLE "management_companies" ADD COLUMN "preferred_currency_id" uuid;--> statement-breakpoint
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_event_logs_category" ON "event_logs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_event_logs_level" ON "event_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_event_logs_event" ON "event_logs" USING btree ("event");--> statement-breakpoint
CREATE INDEX "idx_event_logs_condominium" ON "event_logs" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_event_logs_entity" ON "event_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_event_logs_user" ON "event_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_event_logs_result" ON "event_logs" USING btree ("result");--> statement-breakpoint
CREATE INDEX "idx_event_logs_source" ON "event_logs" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_event_logs_created" ON "event_logs" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "management_companies" ADD CONSTRAINT "management_companies_preferred_currency_id_currencies_id_fk" FOREIGN KEY ("preferred_currency_id") REFERENCES "public"."currencies"("id") ON DELETE set null ON UPDATE no action;