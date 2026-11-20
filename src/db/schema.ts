import { relations, sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["USER", "ADMIN"]);
export const userStatus = pgEnum("user_status", ["ACTIVE", "BANNED"]);
export const editorLevel = pgEnum("editor_level", ["BEGINNER", "MIDDLE", "PRO"]);
export const orderStatus = pgEnum("order_status", [
  "OPEN", // ochiq e'lon, takliflar kutilmoqda
  "PENDING", // to'g'ridan-to'g'ri montajorga yuborilgan, javob kutilmoqda
  "IN_PROGRESS",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
]);
export const proposalStatus = pgEnum("proposal_status", ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"]);
export const paymentStatus = pgEnum("payment_status", ["PENDING", "APPROVED", "REJECTED"]);

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    googleId: text("google_id").unique(),
    email: text("email").notNull().unique(),
    name: text("name").notNull().default(""),
    image: text("image"),
    role: userRole("role").notNull().default("USER"),
    status: userStatus("status").notNull().default("ACTIVE"),
    bannedReason: text("banned_reason"),
    telegram: text("telegram"),
    phone: text("phone"),
    locale: text("locale").notNull().default("uz"),
    createdAt: ts("created_at").notNull().defaultNow(),
    lastLoginAt: ts("last_login_at"),
    // Saytdagi oxirgi faollik (sahifa ochish yoki ochiq tabdan har daqiqadagi signal) — "onlayn" belgisi uchun
    lastSeenAt: ts("last_seen_at"),
  },
  (t) => [index("users_created_idx").on(t.createdAt)],
);

export const sessions = pgTable(
  "sessions",
  {
    // sha256(token) — xom token faqat cookie'da saqlanadi
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const editorProfiles = pgTable(
  "editor_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    displayName: text("display_name").notNull(),
    headline: text("headline").notNull().default(""),
    bio: text("bio").notNull().default(""),
    city: text("city").notNull().default(""),
    level: editorLevel("level").notNull().default("BEGINNER"),
    experienceYears: integer("experience_years").notNull().default(0),
    priceFrom: integer("price_from").notNull().default(10), // USD
    skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
    categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
    telegram: text("telegram"),
    telegramChannel: text("telegram_channel"),
    instagram: text("instagram"),
    youtube: text("youtube"),
    avatarKey: text("avatar_key"),
    isAvailable: boolean("is_available").notNull().default(true),
    isPublished: boolean("is_published").notNull().default(true),
    isVerified: boolean("is_verified").notNull().default(false),
    isHidden: boolean("is_hidden").notNull().default(false), // admin tomonidan yashirilgan
    // reyting (denormalizatsiya — tez saralash uchun)
    ratingAvg: real("rating_avg").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    completedOrders: integer("completed_orders").notNull().default(0),
    onTimeOrders: integer("on_time_orders").notNull().default(0),
    score: real("score").notNull().default(0),
    // TOP (pullik ko'tarish)
    boostWeight: integer("boost_weight").notNull().default(0),
    boostUntil: ts("boost_until"),
    views: integer("views").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("editors_rank_idx").on(t.isPublished, t.isHidden, t.boostWeight.desc(), t.score.desc()),
    index("editors_price_idx").on(t.priceFrom),
    index("editors_categories_idx").using("gin", t.categories),
  ],
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    editorId: uuid("editor_id")
      .notNull()
      .references(() => editorProfiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    priceUsd: integer("price_usd").notNull(),
    deliveryDays: integer("delivery_days").notNull().default(3),
    sort: integer("sort").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("services_editor_idx").on(t.editorId)],
);

export const portfolioItems = pgTable(
  "portfolio_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    editorId: uuid("editor_id")
      .notNull()
      .references(() => editorProfiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url").notNull(),
    provider: text("provider").notNull(), // youtube | vimeo | instagram | telegram | drive | other
    embedId: text("embed_id"),
    coverKey: text("cover_key"),
    category: text("category").notNull().default("other"),
    sort: integer("sort").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("portfolio_editor_idx").on(t.editorId)],
);

export const priceTiers = pgTable("price_tiers", {
  id: serial("id").primaryKey(),
  minUsd: integer("min_usd").notNull(),
  maxUsd: integer("max_usd"), // null = cheksiz
  sort: integer("sort").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    editorId: uuid("editor_id").references(() => editorProfiles.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull().default("other"),
    budgetUsd: integer("budget_usd").notNull(),
    agreedPriceUsd: integer("agreed_price_usd"),
    deadline: ts("deadline").notNull(),
    status: orderStatus("status").notNull().default("OPEN"),
    isPublic: boolean("is_public").notNull().default(true),
    deliveryUrl: text("delivery_url"),
    deliveryNote: text("delivery_note"),
    revisionNote: text("revision_note"),
    revisionCount: integer("revision_count").notNull().default(0),
    cancelReason: text("cancel_reason"),
    proposalCount: integer("proposal_count").notNull().default(0),
    acceptedAt: ts("accepted_at"),
    firstDeliveredAt: ts("first_delivered_at"),
    deliveredAt: ts("delivered_at"),
    completedAt: ts("completed_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("orders_board_idx").on(t.status, t.isPublic, t.budgetUsd, t.createdAt.desc()),
    index("orders_client_idx").on(t.clientId, t.createdAt.desc()),
    index("orders_editor_idx").on(t.editorId, t.createdAt.desc()),
  ],
);

export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    editorId: uuid("editor_id")
      .notNull()
      .references(() => editorProfiles.id, { onDelete: "cascade" }),
    priceUsd: integer("price_usd").notNull(),
    days: integer("days").notNull(),
    message: text("message").notNull(),
    status: proposalStatus("status").notNull().default("PENDING"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("proposals_order_editor_uq").on(t.orderId, t.editorId), index("proposals_editor_idx").on(t.editorId)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: "cascade" }),
    editorId: uuid("editor_id")
      .notNull()
      .references(() => editorProfiles.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quality: integer("quality").notNull(),
    communication: integer("communication").notNull(),
    rating: real("rating").notNull(),
    onTime: boolean("on_time").notNull(),
    comment: text("comment").notNull().default(""),
    isHidden: boolean("is_hidden").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("reviews_editor_idx").on(t.editorId, t.createdAt.desc())],
);

export const promotionPlans = pgTable("promotion_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  days: integer("days").notNull().default(7),
  priceUzs: integer("price_uzs").notNull(),
  weight: integer("weight").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isPopular: boolean("is_popular").notNull().default(false),
  sort: integer("sort").notNull().default(0),
  // Bir vaqtda nechta montajor shu rejada tura oladi (0 = cheklanmagan)
  slots: integer("slots").notNull().default(0),
});

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    editorId: uuid("editor_id")
      .notNull()
      .references(() => editorProfiles.id, { onDelete: "cascade" }),
    planId: integer("plan_id").references(() => promotionPlans.id, { onDelete: "set null" }),
    // to'lov paytidagi reja ma'lumotlari (keyin reja o'zgarsa ham saqlanadi)
    planName: text("plan_name").notNull(),
    days: integer("days").notNull(),
    weight: integer("weight").notNull(),
    amountUzs: integer("amount_uzs").notNull(), // reja narxi + payCode
    // To'lov kodi (100–999 so'm): bankda to'lovni summasidan tanib olish uchun. 0 = eski to'lovlar
    payCode: integer("pay_code").notNull().default(0),
    method: text("method").notNull(), // VISA | UZCARD | HUMO
    payerNote: text("payer_note").notNull().default(""),
    // Chek ixtiyoriy: to'lov odatda bank xabaridan avtomatik tasdiqlanadi (incoming_transfers)
    receiptKey: text("receipt_key"),
    status: paymentStatus("status").notNull().default("PENDING"),
    adminNote: text("admin_note"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: ts("reviewed_at"),
    telegramMessageId: integer("telegram_message_id"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("payments_status_idx").on(t.status, t.createdAt.desc()), index("payments_user_idx").on(t.userId)],
);

/**
 * Kartaga tushgan pullar (bank SMS / bildirishnomasidan): avtomatik to'lov tasdiqlash uchun.
 * Summa kutilayotgan to'lov summasiga (narx + shaxsiy kod) aynan teng bo'lsa — to'lov o'zi tasdiqlanadi.
 */
export const incomingTransfers = pgTable(
  "incoming_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    amountUzs: integer("amount_uzs").notNull(),
    source: text("source").notNull(), // webhook | telegram
    raw: text("raw").notNull().default(""),
    paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("incoming_amount_idx").on(t.amountUzs, t.createdAt.desc())],
);

export const promotions = pgTable(
  "promotions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    editorId: uuid("editor_id")
      .notNull()
      .references(() => editorProfiles.id, { onDelete: "cascade" }),
    paymentId: uuid("payment_id")
      .unique()
      .references(() => payments.id, { onDelete: "set null" }),
    weight: integer("weight").notNull(),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("promotions_editor_idx").on(t.editorId)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: uuid("actor_id"),
    actorLabel: text("actor_label").notNull().default(""),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    meta: jsonb("meta"),
    ip: text("ip"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt.desc())],
);

// ---------- relations ----------
export const usersRelations = relations(users, ({ one, many }) => ({
  editorProfile: one(editorProfiles, { fields: [users.id], references: [editorProfiles.userId] }),
  orders: many(orders),
  payments: many(payments),
}));

export const editorProfilesRelations = relations(editorProfiles, ({ one, many }) => ({
  user: one(users, { fields: [editorProfiles.userId], references: [users.id] }),
  services: many(services),
  portfolio: many(portfolioItems),
  reviews: many(reviews),
  proposals: many(proposals),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  editor: one(editorProfiles, { fields: [services.editorId], references: [editorProfiles.id] }),
}));

export const portfolioRelations = relations(portfolioItems, ({ one }) => ({
  editor: one(editorProfiles, { fields: [portfolioItems.editorId], references: [editorProfiles.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  client: one(users, { fields: [orders.clientId], references: [users.id] }),
  editor: one(editorProfiles, { fields: [orders.editorId], references: [editorProfiles.id] }),
  proposals: many(proposals),
  review: one(reviews, { fields: [orders.id], references: [reviews.orderId] }),
}));

export const proposalsRelations = relations(proposals, ({ one }) => ({
  order: one(orders, { fields: [proposals.orderId], references: [orders.id] }),
  editor: one(editorProfiles, { fields: [proposals.editorId], references: [editorProfiles.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  order: one(orders, { fields: [reviews.orderId], references: [orders.id] }),
  editor: one(editorProfiles, { fields: [reviews.editorId], references: [editorProfiles.id] }),
  author: one(users, { fields: [reviews.authorId], references: [users.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  editor: one(editorProfiles, { fields: [payments.editorId], references: [editorProfiles.id] }),
  plan: one(promotionPlans, { fields: [payments.planId], references: [promotionPlans.id] }),
}));

export type User = typeof users.$inferSelect;
export type EditorProfile = typeof editorProfiles.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type PromotionPlan = typeof promotionPlans.$inferSelect;
export type PriceTier = typeof priceTiers.$inferSelect;
export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type Service = typeof services.$inferSelect;
