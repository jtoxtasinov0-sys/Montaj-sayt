/**
 * Loyiha xonasidagi xabarlardan shaxsiy kontaktlarni yashirish: mijoz va mutaxassis saytni chetlab o'tib
 * Telegram/telefon orqali "o'zaro" ishlab ketmasligi uchun. Yashirilgan joy "•••" bo'ladi.
 *
 * Yashiriladi: telefon raqamlar (9+ raqam), @username, email, t.me / wa.me / vk havolalari,
 * Instagram va TikTok PROFIL havolalari. Qoldiriladi: YouTube, Google Drive, Yandex Disk havolalari va
 * Instagram/TikTok'dagi aniq video (reel, post) havolalari — bular "misol" va katta fayllar uchun kerak.
 */

const MASK = "•••";

// Matndagi havolalar (sxemali yoki "domen.zona/yo'l" ko'rinishida) — ular alohida tekshiriladi:
// ruxsat etilgan havola ichidagi uzun raqamlar (TikTok/Drive ID) telefon deb yashirilmaydi
const URL_RE = /(?:https?:\/\/|www\.)[^\s]+|\b(?:[a-z0-9-]+\.)+(?:com|me|ru|uz|be|am|dog|ly|gl)\/[^\s]*/gi;

// t.me/..., telegram.me, wa.me, WhatsApp, VK, OK, Facebook — har qanday yo'l kontakt hisoblanadi
const MESSENGER_URL =
  /^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.(?:me|dog)|wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|vk\.com|ok\.ru|facebook\.com|fb\.me|m\.me)\//i;
// instagram.com/<username> (lekin /p/, /reel/, /reels/, /tv/, /explore/ — misol video, qoladi)
const INSTAGRAM_PROFILE = /^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?!p\/|reels?\/|tv\/|explore\/)[A-Za-z0-9_.]{2,30}\/?(?:[?#].*)?$/i;
// tiktok.com/@user (lekin tiktok.com/@user/video/123 — misol video, qoladi)
const TIKTOK_PROFILE = /^(?:https?:\/\/)?(?:www\.|vm\.)?tiktok\.com\/@[A-Za-z0-9_.]{2,30}\/?(?:[?#].*)?$/i;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const HANDLE = /(^|[^\w@/.])@[A-Za-z][A-Za-z0-9_]{3,31}\b/g;
// +998 90 123 45 67, 90-123-45-67, (90) 1234567 ... — 9 va undan ko'p raqam (narxlar odatda 8 raqamdan kam)
const PHONE = /\+?\d(?:[\s\-().]{0,3}\d){8,14}/g;

const isContactUrl = (u: string) => MESSENGER_URL.test(u) || INSTAGRAM_PROFILE.test(u) || TIKTOK_PROFILE.test(u);

function maskPlain(part: string, mark: () => void) {
  return part
    .replace(EMAIL, () => (mark(), MASK))
    .replace(HANDLE, (_m, pre: string) => (mark(), `${pre}${MASK}`))
    .replace(PHONE, () => (mark(), MASK));
}

export function maskContacts(input: string): { text: string; masked: boolean } {
  let masked = false;
  const mark = () => {
    masked = true;
  };
  let out = "";
  let last = 0;
  for (const m of input.matchAll(URL_RE)) {
    const i = m.index ?? 0;
    out += maskPlain(input.slice(last, i), mark);
    // Havola oxiridagi tinish belgisi ("...shunga.") havolaga kirmaydi
    const url = m[0].replace(/[),.;:!?]+$/, "");
    if (isContactUrl(url)) {
      mark();
      out += MASK;
    } else out += url;
    last = i + url.length;
  }
  out += maskPlain(input.slice(last), mark);
  // Ketma-ket yashirilgan bo'laklarni bittaga qisqartiramiz
  if (masked) out = out.replace(/•••(?:[\s,;:]*•••)+/g, MASK);
  return { text: out, masked };
}
