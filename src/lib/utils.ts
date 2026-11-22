export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatUzs(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n).replace(/ /g, " ");
}

export function formatUsd(n: number) {
  return `$${new Intl.NumberFormat("en-US").format(n)}`;
}

export function formatDate(d: Date | string, locale = "uz") {
  const date = typeof d === "string" ? new Date(d) : d;
  const loc = locale === "ru" ? "ru-RU" : locale === "en" ? "en-GB" : "uz-UZ";
  try {
    return new Intl.DateTimeFormat(loc, { day: "2-digit", month: "short", year: "numeric" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function daysLeft(until: Date) {
  return Math.max(0, Math.ceil((until.getTime() - Date.now()) / 86_400_000));
}

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "sh",
  ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h",
};

export function slugify(input: string) {
  return input
    .toLowerCase()
    .split("")
    .map((c) => TRANSLIT[c] ?? c)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** LIKE so'rovida % va _ belgilarini xavfsiz qilish */
export function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/** Faqat ichki nisbiy yo'llarga redirect (open-redirect himoyasi) */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next.slice(0, 300);
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "M"
  );
}

export function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = Number.parseInt(String(v ?? ""), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** 1536 → "1.5 KB", 5368709120 → "5 GB" */
export function formatBytes(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / 1024 ** i;
  return `${v >= 100 || i === 0 ? Math.round(v) : Math.round(v * 10) / 10} ${units[i]}`;
}

/**
 * Server va brauzerda bir xil chiqadigan sana (Toshkent vaqti, UTC+5, yozgi vaqt yo'q): "22.11.2026" / "22.11, 06:02".
 * Intl brauzerga qarab har xil yozadi ("22-noy" / "M11 22") — client komponentlarda hydration xatosi bermasligi uchun.
 */
export function stableDate(d: Date | string, withTime = false) {
  const t = new Date(new Date(d).getTime() + 5 * 3_600_000);
  const p2 = (n: number) => String(n).padStart(2, "0");
  const date = `${p2(t.getUTCDate())}.${p2(t.getUTCMonth() + 1)}`;
  return withTime ? `${date}, ${p2(t.getUTCHours())}:${p2(t.getUTCMinutes())}` : `${date}.${t.getUTCFullYear()}`;
}
