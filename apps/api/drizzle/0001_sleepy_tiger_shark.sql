CREATE TABLE "charge_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"label" varchar(100) NOT NULL,
	"label_en" varchar(100),
	"description" text,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "charge_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
DROP INDEX "idx_charge_types_category";--> statement-breakpoint
ALTER TABLE "charge_types" ADD COLUMN "category_id" uuid NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_charge_categories_name" ON "charge_categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_charge_categories_active" ON "charge_categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_charge_categories_system" ON "charge_categories" USING btree ("is_system");--> statement-breakpoint
ALTER TABLE "charge_types" ADD CONSTRAINT "charge_types_category_id_charge_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."charge_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_charge_types_category" ON "charge_types" USING btree ("category_id");--> statement-breakpoint
ALTER TABLE "charge_types" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "charge_types" DROP COLUMN "is_auto_generated";--> statement-breakpoint
ALTER TABLE "charge_types" DROP COLUMN "is_recurring";--> statement-breakpoint
ALTER TABLE "charge_types" DROP COLUMN "default_amount";--> statement-breakpoint
DROP TYPE "public"."charge_category";