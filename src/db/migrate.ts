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
        { minUsd: 20, maxUsd: 30, sort: 1 },
        { minUsd: 30, maxUsd: 40, sort: 2 },
        { minUsd: 40, maxUsd: 50, sort: 3 },
        { minUsd: 50, maxUsd: null, sort: 4 },
      ]);
    }
    const [{ count: planCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(promotionPlans);
    if (planCount === 0) {
      // Yagona tarif: 7 kun, 50 000 so'm, 20 ta joy (bosh sahifada hammasi ko'rinadi) — admin paneldan o'zgaradi
      await db.insert(promotionPlans).values([{ name: "TOP", days: 7, priceUzs: 50000, weight: 10, sort: 1, slots: 20 }]);
    }
    await db.insert(settings).values({ key: "payment_cards", value: DEFAULT_CARDS }).onConflictDoNothing();
  } finally {
    await client`select pg_advisory_unlock(${LOCK_ID})`.catch(() => {});
    await client.end({ timeout: 5 });
  }
}
