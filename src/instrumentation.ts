export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_MIGRATIONS === "true") return;
  const { runMigrations } = await import("./db/migrate");
  const started = Date.now();
  await runMigrations();
  console.log(`[db] migrations ok (${Date.now() - started}ms)`);
}
