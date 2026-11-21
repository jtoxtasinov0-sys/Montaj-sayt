-- Yagona TOP tarifi — 50 000 so'm. Eski (o'chirilgan) Pro/Premium rejalar butunlay olib tashlanadi: admin panelda faqat bitta reja qoladi.
-- To'lovlar tarixi saqlanadi: payments.plan_id NULL bo'ladi, reja nomi va kuni to'lovning o'zida yozilgan.
DELETE FROM "promotion_plans" WHERE "id" <> (SELECT "id" FROM "promotion_plans" ORDER BY "is_active" DESC, "sort", "id" LIMIT 1);--> statement-breakpoint
UPDATE "promotion_plans" SET "name" = 'TOP', "price_uzs" = 50000, "is_active" = true, "is_popular" = false, "sort" = 1;--> statement-breakpoint
-- Hamma TOP montajorlar bitta navbatda: eski Pro/Premium vazni bilan turganlar ham boshqalar bilan teng aylanadi
UPDATE "editor_profiles" e SET "boost_weight" = p."weight" FROM (SELECT "weight" FROM "promotion_plans" LIMIT 1) p
WHERE e."boost_weight" > 0 AND e."boost_weight" <> p."weight";--> statement-breakpoint
UPDATE "payments" pay SET "weight" = p."weight" FROM (SELECT "weight" FROM "promotion_plans" LIMIT 1) p
WHERE pay."status" = 'PENDING' AND pay."weight" <> p."weight";
