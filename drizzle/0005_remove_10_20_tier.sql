-- $10–20 narx bo'limi olib tashlandi: bo'limlar $20–30 dan boshlanadi (admin paneldan qayta yoqsa bo'ladi)
UPDATE "price_tiers" SET "is_active" = false WHERE "min_usd" = 10 AND "max_usd" = 20;
