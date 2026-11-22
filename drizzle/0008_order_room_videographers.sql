-- Loyiha xonasi (buyurtma ichida chat va fayllar: saytga yoki Telegram bot orqali), videograflar (profil turi, buyurtmada "syomka"), Telegram bildirishnomalari
CREATE TABLE "order_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"uploader_id" uuid NOT NULL,
	"name" text NOT NULL,
	"size" bigint NOT NULL,
	"mime" text DEFAULT 'application/octet-stream' NOT NULL,
	"purpose" text DEFAULT 'material' NOT NULL,
	"status" text DEFAULT 'uploading' NOT NULL,
	"storage" text DEFAULT 'disk' NOT NULL,
	"tg_file_id" text,
	"tg_kind" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ready_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "order_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"author_id" uuid,
	"body" text DEFAULT '' NOT NULL,
	"file_id" uuid,
	"masked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "editor_profiles" ADD COLUMN "roles" text[] DEFAULT '{editor}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "service" text DEFAULT 'edit' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "last_message_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "client_read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "editor_read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tg_chat_id" bigint;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tg_link_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tg_order_id" uuid;--> statement-breakpoint
ALTER TABLE "order_files" ADD CONSTRAINT "order_files_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_files" ADD CONSTRAINT "order_files_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_file_id_order_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."order_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_files_order_idx" ON "order_files" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_files_status_idx" ON "order_files" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "order_messages_order_idx" ON "order_messages" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "editors_roles_idx" ON "editor_profiles" USING gin ("roles");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tg_link_code_unique" UNIQUE("tg_link_code");