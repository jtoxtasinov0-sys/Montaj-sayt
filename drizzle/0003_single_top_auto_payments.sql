CREATE TABLE "incoming_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amount_uzs" integer NOT NULL,
	"source" text NOT NULL,
	"raw" text DEFAULT '' NOT NULL,
	"payment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "receipt_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "promotion_plans" ALTER COLUMN "days" SET DEFAULT 7;--> statement-breakpoint
ALTER TABLE "incoming_transfers" ADD CONSTRAINT "incoming_transfers_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "incoming_amount_idx" ON "incoming_transfers" USING btree ("amount_uzs","created_at" DESC NULLS LAST);--> statement-breakpoint
-- Yagona TOP tarifi: 50 000 so'm, 7 kun, 20 ta joy. Qolgan rejalar o'chiriladi (to'lovlar tarixi saqlanadi).
-- Allaqachon faol TOP'lar muddati tugaguncha o'z joyida qoladi.
UPDATE "promotion_plans" SET "is_active" = false, "is_popular" = false;--> statement-breakpoint
UPDATE "promotion_plans" SET "name" = 'TOP', "days" = 7, "price_uzs" = 50000, "weight" = 10, "slots" = 20, "sort" = 1, "is_active" = true
WHERE "id" = (SELECT min("id") FROM "promotion_plans");--> statement-breakpoint
-- "To'y va marosim" yo'nalishi olib tashlandi
UPDATE "editor_profiles" SET "categories" = array_remove("categories", 'wedding') WHERE 'wedding' = ANY("categories");--> statement-breakpoint
UPDATE "portfolio_items" SET "category" = 'other' WHERE "category" = 'wedding';--> statement-breakpoint
UPDATE "orders" SET "category" = 'other' WHERE "category" = 'wedding';
