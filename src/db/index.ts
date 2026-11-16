import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __pg: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  // postgres() so'rov kelgandagina ulanadi — build paytida DATABASE_URL bo'lmasa ham import xato bermaydi
  const url = process.env.DATABASE_URL ?? "postgres://unset:unset@127.0.0.1:5432/unset";
  return postgres(url, {
    max: Number(process.env.DB_POOL_MAX ?? 15),
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: true,
    onnotice: () => {},
  });
}

// Dev rejimida HMR paytida ulanishlar ko'payib ketmasligi uchun global
const client = globalThis.__pg ?? createClient();
if (process.env.NODE_ENV !== "production") globalThis.__pg = client;

export const db = drizzle(client, { schema });
export type DB = typeof db;
export { schema };
