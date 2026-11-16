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
