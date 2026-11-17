-- "Musiqiy klip" yo'nalishi olib tashlandi: eski yozuvlarni tozalash
UPDATE "editor_profiles" SET "categories" = array_remove("categories", 'music') WHERE 'music' = ANY("categories");--> statement-breakpoint
UPDATE "portfolio_items" SET "category" = 'other' WHERE "category" = 'music';--> statement-breakpoint
UPDATE "orders" SET "category" = 'other' WHERE "category" = 'music';
