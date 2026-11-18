ALTER TABLE "payments" ADD COLUMN "pay_code" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "promotion_plans" ADD COLUMN "slots" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Boshlang'ich joy limitlari (admin paneldan o'zgartiriladi; 0 = cheklanmagan)
UPDATE "promotion_plans" SET "slots" = 5 WHERE "name" = 'Premium';--> statement-breakpoint
UPDATE "promotion_plans" SET "slots" = 10 WHERE "name" = 'Pro';--> statement-breakpoint
UPDATE "promotion_plans" SET "slots" = 15 WHERE "name" = 'Start';
