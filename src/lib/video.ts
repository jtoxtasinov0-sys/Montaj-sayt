export type VideoProvider = "youtube" | "vimeo" | "instagram" | "telegram" | "drive" | "tiktok" | "other";

export type ParsedVideo = { provider: VideoProvider; embedId: string | null; url: string };

/** Foydalanuvchi kiritgan havolani tekshiradi va provayderni aniqlaydi. Faqat https. */
export function parseVideoUrl(raw: string): ParsedVideo | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\.|^m\./, "").toLowerCase();
  const url = u.toString();

  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return validYt(id) ? { provider: "youtube", embedId: id, url } : { provider: "youtube", embedId: null, url };
  }
  if (host === "youtube.com" || host === "music.youtube.com") {
    let id = u.searchParams.get("v");
    const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{11})/);
    if (!id && m) id = m[2];
    return { provider: "youtube", embedId: id && validYt(id) ? id : null, url };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/(\d{6,12})/);
    return { provider: "vimeo", embedId: m ? m[1] : null, url };
  }
  if (host === "instagram.com") return { provider: "instagram", embedId: null, url };
  if (host === "t.me" || host === "telegram.me") return { provider: "telegram", embedId: null, url };
  if (host === "drive.google.com") return { provider: "drive", embedId: null, url };
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return { provider: "tiktok", embedId: null, url };
  return { provider: "other", embedId: null, url };
}

function validYt(id: string | null | undefined): id is string {
  return !!id && /^[\w-]{11}$/.test(id);
}

export function videoThumb(provider: string, embedId: string | null) {
  if (provider === "youtube" && embedId) return `https://i.ytimg.com/vi/${embedId}/hqdefault.jpg`;
  return null;
}

export function embedSrc(provider: string, embedId: string | null) {
  if (!embedId) return null;
  if (provider === "youtube") return `https://www.youtube-nocookie.com/embed/${embedId}?autoplay=1&rel=0`;
  if (provider === "vimeo") return `https://player.vimeo.com/video/${embedId}?autoplay=1`;
  return null;
}

/** Ijtimoiy tarmoq username'larini tozalash */
export function cleanHandle(v: string | null | undefined) {
  if (!v) return null;
  let s = v.trim();
  s = s.replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me|instagram\.com)\//i, "");
  s = s.replace(/^@/, "").split(/[/?#]/)[0];
  return /^[A-Za-z0-9_.]{3,40}$/.test(s) ? s : null;
}

/**
 * Telegram kanal yoki guruh: "@kanal", "kanal", "t.me/kanal", "https://t.me/kanal/123" → "kanal";
 * yopiq guruh/kanal taklif havolasi "https://t.me/+AbC…" → "+AbC…", "t.me/joinchat/AbC…" → "joinchat/AbC…".
 * Saqlangan qiymat har doim `https://t.me/${qiymat}` ko'rinishida ochiladi.
 */
export function cleanTelegramLink(v: string | null | undefined) {
  if (!v) return null;
  let s = v.trim().replace(/^https?:\/\//i, "");
  s = s.replace(/^(www\.)?(t\.me|telegram\.me|telegram\.dog)\//i, "").replace(/^@/, "");
  s = s.split(/[?#]/)[0].replace(/\/+$/, "");
  if (/^\+[A-Za-z0-9_-]{8,64}$/.test(s)) return s;
  if (/^joinchat\/[A-Za-z0-9_-]{8,64}$/.test(s)) return s;
  s = s.replace(/^s\//, "").split("/")[0];
  return /^[A-Za-z0-9_]{4,32}$/.test(s) ? s : null;
}

/** Taklif havolasi (yopiq guruh/kanal) bo'lsa — nomi ko'rsatilmaydi */
export const isTelegramInvite = (v: string) => v.startsWith("+") || v.startsWith("joinchat/");

/** Faqat Google Drive (papka yoki fayl) havolasi, https */
export function cleanDriveUrl(v: string | null | undefined) {
  if (!v) return null;
  try {
    const u = new URL(v.trim());
    const host = u.hostname.toLowerCase();
    if (u.protocol !== "https:" || (host !== "drive.google.com" && host !== "docs.google.com")) return null;
    const s = u.toString();
    return s.length <= 500 ? s : null;
  } catch {
    return null;
  }
}

/** 42.3 → "0:42" */
export function formatDuration(sec: number | null | undefined) {
  if (!sec || !Number.isFinite(sec)) return null;
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Saytga yuklangan video vertikalmi (Reels/Shorts/TikTok, 9:16). Kvadrat va gorizontal (YouTube, 16:9) — yo'q. */
export function isVerticalVideo(it: { provider: string; width?: number | null; height?: number | null }) {
  return it.provider === "upload" && !!it.width && !!it.height && it.height > it.width * 1.1;
}

/** Format belgisi: "9:16" (Reels), "1:1" (kvadrat), "16:9" (YouTube) */
export function videoFormatLabel(width?: number | null, height?: number | null) {
  if (!width || !height) return null;
  const r = width / height;
  return r < 0.9 ? "9:16" : r <= 1.1 ? "1:1" : "16:9";
}
