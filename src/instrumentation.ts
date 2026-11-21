export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  if (process.env.SKIP_MIGRATIONS !== "true") {
    const { runMigrations } = await import("./db/migrate");
    const started = Date.now();
    await runMigrations();
    console.log(`[db] migrations ok (${Date.now() - started}ms)`);
  }

  // Portfolio videolarini siqish navbati — faqat bitta ishchi jarayonda (server-cluster.cjs WORKER_INDEX beradi),
  // videolar birma-bir siqiladi va CPU sayt so'rovlari uchun bo'sh qoladi. VIDEO_WORKER=off — o'chirish.
  if (process.env.VIDEO_WORKER !== "off" && (process.env.WORKER_INDEX ?? "0") === "0") {
    const { startVideoWorker } = await import("./lib/video-worker");
    startVideoWorker();
  }
}
