/** Klient va server komponentlarda ishlatiladigan URL yordamchisi */
const KEY_RE = /^(avatars|covers)\/[a-f0-9-]{36}\.webp$/;

export function uploadUrl(key: string | null | undefined) {
  return key && KEY_RE.test(key) ? `/api/files/${key}` : null;
}

/** "/api/files/avatars/uuid.webp" → "avatars/uuid.webp" (o'zimiz yuklagan rasm bo'lsa), aks holda null */
export function keyFromUploadUrl(url: string | null | undefined) {
  const key = url?.startsWith("/api/files/") ? url.slice("/api/files/".length) : null;
  return key && KEY_RE.test(key) ? key : null;
}

const VIDEO_KEY_RE = /^videos\/[a-f0-9-]{36}\.mp4$/;

/** Saytga yuklangan (serverda siqilgan) portfolio videosining manzili */
export function videoUrl(key: string | null | undefined) {
  return key && VIDEO_KEY_RE.test(key) ? `/api/files/${key}` : null;
}
