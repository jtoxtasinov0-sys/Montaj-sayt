/**
 * Saytga yangi versiya chiqarilganda (deploy) ochiq turgan eski sahifa endi mavjud bo'lmagan server funksiyasini
 * (Server Action) yoki JS faylni chaqirishi mumkin: Next.js har bir build'da yangi kalit yaratadi va action ID'lar
 * o'zgaradi. Natijada "Saqlash" bosilganda "Nimadir xato ketdi" chiqardi. Bunday xatoni tanib, sahifani bir marta
 * yangilaymiz — yangi sahifa yangi versiya bilan ishlaydi.
 */

export function isStaleDeployError(e: unknown) {
  const err = e as { name?: unknown; message?: unknown } | null;
  const text = `${String(err?.name ?? "")} ${String(err?.message ?? "")}`;
  return /UnrecognizedActionError|Server Action .* was not found|Failed to find Server Action|ChunkLoadError|Loading chunk .* failed|Failed to load chunk|dynamically imported module/i.test(
    text,
  );
}

const KEY = "stale-deploy-reload-at";

/**
 * Sahifani yangilaydi. Cheksiz aylanib qolmasligi uchun 30 soniyada bir martadan ko'p emas:
 * qayta yuklash yordam bermagan bo'lsa false qaytaradi (unda foydalanuvchiga tugma ko'rsatiladi).
 */
export function reloadForNewVersion() {
  try {
    if (Date.now() - Number(sessionStorage.getItem(KEY) || 0) < 30_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {}
  window.location.reload();
  return true;
}
