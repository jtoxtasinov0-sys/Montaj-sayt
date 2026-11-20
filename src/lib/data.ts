import "server-only";
import { and, asc, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  editorProfiles,
  orders,
  portfolioItems,
  priceTiers,
  promotionPlans,
  reviews,
  services,
  settings,
  users,
  type PriceTier,
} from "@/db/schema";
import { cached } from "@/lib/cache";
import { DEFAULT_CARDS, LIMITS, TOP_ROTATE_MINUTES } from "@/lib/constants";
import { expireBoosts } from "@/lib/ranking";
import { escapeLike } from "@/lib/utils";

// ---------------- sozlamalar ----------------
export type PaymentCard = { type: string; number: string; holder: string; bank?: string };

export function getPaymentCards() {
  return cached("settings:cards", 60_000, async () => {
    const rows = await db.select().from(settings).where(eq(settings.key, "payment_cards")).limit(1);
    const v = rows[0]?.value;
    return (Array.isArray(v) ? v : DEFAULT_CARDS) as PaymentCard[];
  });
}

export function getTiers() {
  return cached("tiers", 300_000, () =>
    db.select().from(priceTiers).where(eq(priceTiers.isActive, true)).orderBy(asc(priceTiers.sort), asc(priceTiers.minUsd)),
  );
}

export function tierLabel(t: Pick<PriceTier, "minUsd" | "maxUsd">) {
  return t.maxUsd ? `$${t.minUsd}–${t.maxUsd}` : `$${t.minUsd}+`;
}

/** [min, max) oralig'i; oxirgi bo'limda max yo'q */
export function tierRange(column: typeof editorProfiles.priceFrom | typeof orders.budgetUsd, t: PriceTier): SQL {
  return t.maxUsd ? and(gte(column, t.minUsd), lt(column, t.maxUsd))! : gte(column, t.minUsd);
}

export function getPlans() {
  return cached("plans", 300_000, () =>
    db.select().from(promotionPlans).where(eq(promotionPlans.isActive, true)).orderBy(asc(promotionPlans.sort)),
  );
}

// ---------------- montajorlar ----------------
const cardColumns = {
  id: editorProfiles.id,
  slug: editorProfiles.slug,
  displayName: editorProfiles.displayName,
  headline: editorProfiles.headline,
  city: editorProfiles.city,
  level: editorProfiles.level,
  priceFrom: editorProfiles.priceFrom,
  categories: editorProfiles.categories,
  avatarKey: editorProfiles.avatarKey,
  userImage: users.image,
  lastSeenAt: users.lastSeenAt,
  isAvailable: editorProfiles.isAvailable,
  isVerified: editorProfiles.isVerified,
  ratingAvg: editorProfiles.ratingAvg,
  ratingCount: editorProfiles.ratingCount,
  completedOrders: editorProfiles.completedOrders,
  onTimeOrders: editorProfiles.onTimeOrders,
  boostWeight: editorProfiles.boostWeight,
  boostUntil: editorProfiles.boostUntil,
  score: editorProfiles.score,
};

export type EditorCardData = {
  id: string;
  slug: string;
  displayName: string;
  headline: string;
  city: string;
  level: "BEGINNER" | "MIDDLE" | "PRO";
  priceFrom: number;
  categories: string[];
  avatarKey: string | null;
  userImage: string | null;
  lastSeenAt: Date | null;
  isAvailable: boolean;
  isVerified: boolean;
  ratingAvg: number;
  ratingCount: number;
  completedOrders: number;
  onTimeOrders: number;
  boostWeight: number;
  boostUntil: Date | null;
  score: number;
};

export type EditorFilters = {
  q?: string;
  tier?: number;
  category?: string;
  level?: string;
  sort?: string;
  page?: number;
};

/**
 * Asosiy tartib: avval TOP (reja vazni), keyin TOPsizlar reyting bo'yicha.
 * Bir xil rejadagilar har TOP_ROTATE_MINUTES (30) daqiqada navbat bilan almashadi (karusel): har safar hamma
 * bir pog'ona pastga suriladi, eng pastdagi esa tepaga chiqadi — n kishi bo'lsa, har biri n×30 daqiqada bir marta 1-o'rinda.
 * Oyna funksiyalari WHERE'dan keyin hisoblanadi, ya'ni filtrlangan ro'yxat ichida ham adolatli.
 */
function topOrder() {
  const slot = Math.floor(Date.now() / (TOP_ROTATE_MINUTES * 60_000));
  const turn = sql`case when ${editorProfiles.boostWeight} > 0 then
    (row_number() over (partition by ${editorProfiles.boostWeight} order by ${editorProfiles.id}) + ${slot}::bigint)
    % count(*) over (partition by ${editorProfiles.boostWeight}) end`;
  return [desc(editorProfiles.boostWeight), asc(turn), desc(editorProfiles.score), desc(editorProfiles.createdAt)];
}

const visible = and(eq(editorProfiles.isPublished, true), eq(editorProfiles.isHidden, false))!;

export async function listEditors(f: EditorFilters) {
  await expireBoosts();
  const key = `editors:list:${JSON.stringify(f)}`;
  return cached(key, 20_000, async () => {
    const conds: SQL[] = [visible];
    if (f.q) {
      const like = `%${escapeLike(f.q)}%`;
      conds.push(or(ilike(editorProfiles.displayName, like), ilike(editorProfiles.headline, like))!);
    }
    if (f.tier) {
      const tier = (await getTiers()).find((t) => t.id === f.tier);
      if (tier) conds.push(tierRange(editorProfiles.priceFrom, tier));
    }
    if (f.category) conds.push(sql`${editorProfiles.categories} @> ARRAY[${f.category}]::text[]`);
    if (f.level === "BEGINNER" || f.level === "MIDDLE" || f.level === "PRO") conds.push(eq(editorProfiles.level, f.level));

    const order =
      f.sort === "rating"
        ? [desc(editorProfiles.ratingAvg), desc(editorProfiles.ratingCount)]
        : f.sort === "new"
          ? [desc(editorProfiles.createdAt)]
          : f.sort === "price_asc"
            ? [asc(editorProfiles.priceFrom), desc(editorProfiles.score)]
            : f.sort === "price_desc"
              ? [desc(editorProfiles.priceFrom), desc(editorProfiles.score)]
              : topOrder();

    const page = Math.max(1, f.page ?? 1);
    const where = and(...conds);
    const [items, [{ total }]] = await Promise.all([
      db
        .select(cardColumns)
        .from(editorProfiles)
        .innerJoin(users, eq(users.id, editorProfiles.userId))
        .where(where)
        .orderBy(...order)
        .limit(LIMITS.pageSize)
        .offset((page - 1) * LIMITS.pageSize),
      db.select({ total: sql<number>`count(*)::int` }).from(editorProfiles).where(where),
    ]);
    return { items: items as EditorCardData[], total, page, pages: Math.max(1, Math.ceil(total / LIMITS.pageSize)) };
  });
}

export async function getTopEditors(limit = 8) {
  await expireBoosts();
  return cached(`editors:top:${limit}`, 30_000, async () => {
    const items = await db
      .select(cardColumns)
      .from(editorProfiles)
      .innerJoin(users, eq(users.id, editorProfiles.userId))
      .where(visible)
      .orderBy(...topOrder())
      .limit(limit);
    return items as EditorCardData[];
  });
}

export async function getEditorBySlug(slug: string) {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;
  return cached(`editors:slug:${slug}`, 15_000, async () => {
    const rows = await db
      .select({ profile: editorProfiles, userImage: users.image, userCreatedAt: users.createdAt, lastSeenAt: users.lastSeenAt })
      .from(editorProfiles)
      .innerJoin(users, eq(users.id, editorProfiles.userId))
      .where(eq(editorProfiles.slug, slug))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const id = row.profile.id;
    const [svc, portfolio, revs] = await Promise.all([
      db.select().from(services).where(eq(services.editorId, id)).orderBy(asc(services.sort), asc(services.priceUsd)),
      db
        .select()
        .from(portfolioItems)
        .where(eq(portfolioItems.editorId, id))
        .orderBy(asc(portfolioItems.sort), desc(portfolioItems.createdAt)),
      db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          quality: reviews.quality,
          communication: reviews.communication,
          onTime: reviews.onTime,
          comment: reviews.comment,
          createdAt: reviews.createdAt,
          authorName: users.name,
          orderTitle: orders.title,
        })
        .from(reviews)
        .innerJoin(users, eq(users.id, reviews.authorId))
        .innerJoin(orders, eq(orders.id, reviews.orderId))
        .where(and(eq(reviews.editorId, id), eq(reviews.isHidden, false)))
        .orderBy(desc(reviews.createdAt))
        .limit(30),
    ]);
    return { ...row, services: svc, portfolio, reviews: revs };
  });
}

// ---------------- buyurtmalar ----------------
export async function listOpenJobs(f: { tier?: number; category?: string; page?: number }) {
  return cached(`jobs:list:${JSON.stringify(f)}`, 15_000, async () => {
    const conds: SQL[] = [eq(orders.status, "OPEN"), eq(orders.isPublic, true)];
    if (f.tier) {
      const tier = (await getTiers()).find((t) => t.id === f.tier);
      if (tier) conds.push(tierRange(orders.budgetUsd, tier));
    }
    if (f.category) conds.push(eq(orders.category, f.category));
    const page = Math.max(1, f.page ?? 1);
    const where = and(...conds);
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: orders.id,
          title: orders.title,
          description: orders.description,
          category: orders.category,
          budgetUsd: orders.budgetUsd,
          deadline: orders.deadline,
          proposalCount: orders.proposalCount,
          createdAt: orders.createdAt,
          clientName: users.name,
        })
        .from(orders)
        .innerJoin(users, eq(users.id, orders.clientId))
        .where(where)
        .orderBy(desc(orders.createdAt))
        .limit(LIMITS.pageSize)
        .offset((page - 1) * LIMITS.pageSize),
      db.select({ total: sql<number>`count(*)::int` }).from(orders).where(where),
    ]);
    return { items, total, page, pages: Math.max(1, Math.ceil(total / LIMITS.pageSize)) };
  });
}

export async function getTierCounts() {
  return cached("jobs:tiercounts", 30_000, async () => {
    const tiers = await getTiers();
    const result: Record<number, { editors: number; jobs: number }> = {};
    await Promise.all(
      tiers.map(async (t) => {
        const [[e], [j]] = await Promise.all([
          db
            .select({ n: sql<number>`count(*)::int` })
            .from(editorProfiles)
            .where(and(visible, tierRange(editorProfiles.priceFrom, t))),
          db
            .select({ n: sql<number>`count(*)::int` })
            .from(orders)
            .where(and(eq(orders.status, "OPEN"), eq(orders.isPublic, true), tierRange(orders.budgetUsd, t))),
        ]);
        result[t.id] = { editors: e.n, jobs: j.n };
      }),
    );
    return result;
  });
}

export async function getHomeStats() {
  return cached("stats:home", 60_000, async () => {
    const [[e], [o], [r]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(editorProfiles).where(visible),
      db
        .select({
          completed: sql<number>`count(*) filter (where ${orders.status} = 'COMPLETED')::int`,
          onTime: sql<number>`count(*) filter (where ${orders.status} = 'COMPLETED' and ${orders.firstDeliveredAt} <= ${orders.deadline})::int`,
        })
        .from(orders),
      db.select({ avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float` }).from(reviews).where(eq(reviews.isHidden, false)),
    ]);
    return {
      editors: e.n,
      completed: o.completed,
      onTimePct: o.completed ? Math.round((o.onTime / o.completed) * 100) : 0,
      avgRating: Math.round(r.avg * 10) / 10,
    };
  });
}

/** Portfolio uchun eng so'nggi ishlar (bosh sahifa "showcase") */
export async function getRecentPortfolio(limit = 10) {
  return cached(`editors:portfolio:${limit}`, 60_000, () =>
    db
      .select({
        id: portfolioItems.id,
        title: portfolioItems.title,
        provider: portfolioItems.provider,
        embedId: portfolioItems.embedId,
        coverKey: portfolioItems.coverKey,
        category: portfolioItems.category,
        slug: editorProfiles.slug,
        editorName: editorProfiles.displayName,
      })
      .from(portfolioItems)
      .innerJoin(editorProfiles, eq(editorProfiles.id, portfolioItems.editorId))
      .where(visible)
      .orderBy(desc(portfolioItems.createdAt))
      .limit(limit),
  );
}

/** Bosh sahifadagi "Mijozlar fikri": yashirilmagan, 4★ va undan yuqori, mazmunli izohli so'nggi baholar */
export async function getRecentReviews(limit = 6) {
  return cached(`reviews:recent:${limit}`, 60_000, async () => {
    const rows = await db
      .select({
        id: reviews.id,
        comment: reviews.comment,
        rating: reviews.rating,
        authorName: users.name,
        editorName: editorProfiles.displayName,
        slug: editorProfiles.slug,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.authorId))
      .innerJoin(editorProfiles, eq(editorProfiles.id, reviews.editorId))
      .where(and(eq(reviews.isHidden, false), gte(reviews.rating, 4), sql`length(${reviews.comment}) >= 20`))
      .orderBy(desc(reviews.createdAt))
      .limit(limit);
    // Mijoz maxfiyligi: faqat ism va familiyaning bosh harfi ("Jasur T.")
    return rows.map((r) => {
      const [first, last] = (r.authorName || "").trim().split(/\s+/);
      return { ...r, authorName: first ? `${first}${last ? ` ${last[0]}.` : ""}` : "—" };
    });
  });
}
