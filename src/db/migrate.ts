import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { priceTiers, promotionPlans, settings } from "./schema";
import { DEFAULT_CARDS } from "../lib/constants";

const LOCK_ID = 774411; // pg_advisory_lock — bir nechta konteyner bir vaqtda migratsiya qilmasligi uchun


export async function runMigrations() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { max: 1, onnotice: () => {} });
  const db = drizzle(client);
  try {
    await client`select pg_advisory_lock(${LOCK_ID})`;
    await migrate(db, { migrationsFolder: process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), "drizzle") });

    // Boshlang'ich ma'lumotlar (faqat bo'sh bo'lsa)
    const [{ count: tierCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(priceTiers);
    if (tierCount === 0) {
      await db.insert(priceTiers).values([
        { minUsd: 10, maxUsd: 20, sort: 1 },
        { minUsd: 20, maxUsd: 30, sort: 2 },
        { minUsd: 30, maxUsd: 40, sort: 3 },
        { minUsd: 40, maxUsd: 50, sort: 4 },
        { minUsd: 50, maxUsd: null, sort: 5 },
      ]);
    }
    const [{ count: planCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(promotionPlans);
    if (planCount === 0) {
      await db.insert(promotionPlans).values([
        { name: "Start", days: 10, priceUzs: 30000, weight: 10, sort: 1, slots: 15 },
        { name: "Pro", days: 10, priceUzs: 40000, weight: 20, sort: 2, isPopular: true, slots: 10 },
        { name: "Premium", days: 10, priceUzs: 50000, weight: 30, sort: 3, slots: 5 },
      ]);
    }
    await db.insert(settings).values({ key: "payment_cards", value: DEFAULT_CARDS }).onConflictDoNothing();
  } finally {
    await client`select pg_advisory_unlock(${LOCK_ID})`.catch(() => {});
    await client.end({ timeout: 5 });
  }
}
