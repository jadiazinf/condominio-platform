ALTER TABLE "charge_categories" ADD COLUMN "labels" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "charge_categories" DROP COLUMN "label";--> statement-breakpoint
ALTER TABLE "charge_categories" DROP COLUMN "label_en";