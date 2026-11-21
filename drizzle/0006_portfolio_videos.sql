-- Portfolio: saytga yuklanadigan videolar (holat, fayl, davomiylik) va Google Drive havolasi
ALTER TABLE "editor_profiles" ADD COLUMN "drive_url" text;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD COLUMN "video_status" text;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD COLUMN "video_key" text;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD COLUMN "upload_bytes" bigint;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD COLUMN "duration_sec" real;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD COLUMN "height" integer;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD COLUMN "video_error" text;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD COLUMN "processing_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "portfolio_video_status_idx" ON "portfolio_items" USING btree ("video_status","created_at");