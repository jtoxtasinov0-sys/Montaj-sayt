CREATE TYPE "public"."editor_level" AS ENUM('BEGINNER', 'MIDDLE', 'PRO');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('OPEN', 'PENDING', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'BANNED');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"actor_label" text DEFAULT '' NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"meta" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"level" "editor_level" DEFAULT 'BEGINNER' NOT NULL,
	"experience_years" integer DEFAULT 0 NOT NULL,
	"price_from" integer DEFAULT 10 NOT NULL,
	"skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"telegram" text,
	"telegram_channel" text,
	"instagram" text,
	"youtube" text,
	"avatar_key" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"rating_avg" real DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"completed_orders" integer DEFAULT 0 NOT NULL,
	"on_time_orders" integer DEFAULT 0 NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"boost_weight" integer DEFAULT 0 NOT NULL,
	"boost_until" timestamp with time zone,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editor_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "editor_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"editor_id" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"budget_usd" integer NOT NULL,
	"agreed_price_usd" integer,
	"deadline" timestamp with time zone NOT NULL,
	"status" "order_status" DEFAULT 'OPEN' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"delivery_url" text,
	"delivery_note" text,
	"revision_note" text,
	"revision_count" integer DEFAULT 0 NOT NULL,
	"cancel_reason" text,
	"proposal_count" integer DEFAULT 0 NOT NULL,
	"accepted_at" timestamp with time zone,
	"first_delivered_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"editor_id" uuid NOT NULL,
	"plan_id" integer,
	"plan_name" text NOT NULL,
	"days" integer NOT NULL,
	"weight" integer NOT NULL,
	"amount_uzs" integer NOT NULL,
	"method" text NOT NULL,
	"payer_note" text DEFAULT '' NOT NULL,
	"receipt_key" text NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"admin_note" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"telegram_message_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"editor_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"provider" text NOT NULL,
	"embed_id" text,
	"cover_key" text,
	"category" text DEFAULT 'other' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"min_usd" integer NOT NULL,
	"max_usd" integer,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"days" integer DEFAULT 10 NOT NULL,
	"price_uzs" integer NOT NULL,
	"weight" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"editor_id" uuid NOT NULL,
	"payment_id" uuid,
	"weight" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotions_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"editor_id" uuid NOT NULL,
	"price_usd" integer NOT NULL,
	"days" integer NOT NULL,
	"message" text NOT NULL,
	"status" "proposal_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"editor_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"quality" integer NOT NULL,
	"communication" integer NOT NULL,
	"rating" real NOT NULL,
	"on_time" boolean NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"editor_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_usd" integer NOT NULL,
	"delivery_days" integer DEFAULT 3 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_id" text,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"banned_reason" text,
	"telegram" text,
	"phone" text,
	"locale" text DEFAULT 'uz' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "editor_profiles" ADD CONSTRAINT "editor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_editor_id_editor_profiles_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."editor_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_editor_id_editor_profiles_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."editor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_plan_id_promotion_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."promotion_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_editor_id_editor_profiles_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."editor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_editor_id_editor_profiles_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."editor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_editor_id_editor_profiles_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."editor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_editor_id_editor_profiles_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."editor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_editor_id_editor_profiles_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."editor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "editors_rank_idx" ON "editor_profiles" USING btree ("is_published","is_hidden","boost_weight" DESC NULLS LAST,"score" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "editors_price_idx" ON "editor_profiles" USING btree ("price_from");--> statement-breakpoint
CREATE INDEX "editors_categories_idx" ON "editor_profiles" USING gin ("categories");--> statement-breakpoint
CREATE INDEX "orders_board_idx" ON "orders" USING btree ("status","is_public","budget_usd","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "orders_client_idx" ON "orders" USING btree ("client_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "orders_editor_idx" ON "orders" USING btree ("editor_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "payments_user_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "portfolio_editor_idx" ON "portfolio_items" USING btree ("editor_id");--> statement-breakpoint
CREATE INDEX "promotions_editor_idx" ON "promotions" USING btree ("editor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_order_editor_uq" ON "proposals" USING btree ("order_id","editor_id");--> statement-breakpoint
CREATE INDEX "proposals_editor_idx" ON "proposals" USING btree ("editor_id");--> statement-breakpoint
CREATE INDEX "reviews_editor_idx" ON "reviews" USING btree ("editor_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "services_editor_idx" ON "services" USING btree ("editor_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "users_created_idx" ON "users" USING btree ("created_at");