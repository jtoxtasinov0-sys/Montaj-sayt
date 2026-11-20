import "server-only";

const list = (v?: string) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const env = {
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  adminEmails: list(process.env.ADMIN_EMAILS).map((e) => e.toLowerCase()),
  uploadDir: process.env.UPLOAD_DIR ?? `${process.cwd()}/uploads`,
  /** Bank xabarlarini qabul qiluvchi /api/payments/incoming uchun maxfiy kalit (avtomatik to'lov tasdiqlash) */
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? "",
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN ?? "",
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID ?? "",
    adminIds: list(process.env.TELEGRAM_ADMIN_IDS),
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
  /** Faqat localhost'da va aniq yoqilganda ishlaydi — real domenda hech qachon. */
  get devLoginEnabled() {
    return process.env.ALLOW_DEV_LOGIN === "true" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(this.appUrl);
  },
  get secureCookies() {
    return this.appUrl.startsWith("https://");
  },
};
