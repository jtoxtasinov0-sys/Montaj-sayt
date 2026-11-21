/**
 * Sayt (brend) nomi — butun saytda faqat shu yerdan olinadi.
 * Nomni o'zgartirish uchun shu qatorni tahrirlang (yoki serverda NEXT_PUBLIC_SITE_NAME ni bering).
 */
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Montaj Club";

/** Bosh sahifadagi TOP montajorlar soni (TOP joylari soniga teng — to'lagan har bir montajor bosh sahifada ko'rinadi) */
export const HOME_TOP_COUNT = 20;

/** So'nggi shuncha vaqt ichida saytda faol bo'lgan montajor "onlayn" (yashil nuqta) hisoblanadi */
export const ONLINE_WINDOW_MS = 3 * 60_000;
/** Ochiq tab shu oraliqda "shu yerdaman" signalini yuboradi (ONLINE_WINDOW_MS dan kichik bo'lsin) */
export const PRESENCE_PING_MS = 60_000;

/** TOPdagi bir xil rejadagi montajorlar necha daqiqada navbat bilan almashadi */
export const TOP_ROTATE_MINUTES = 30;

export const LOCALES = ["uz", "ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "uz";

/** Yo'nalishlar. `icon` — public/images/icons dagi Gemini'da chizilgan oq-qora ikonka */
export const CATEGORIES = [
  { key: "reels", icon: "reels" },
  { key: "youtube", icon: "youtube" },
  { key: "ads", icon: "ads" },
  { key: "motion", icon: "motion" },
  { key: "podcast", icon: "podcast" },
  { key: "color", icon: "color" },
  { key: "other", icon: "youtube" },
] as const;
export type CategoryKey = (typeof CATEGORIES)[number]["key"];
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key) as [CategoryKey, ...CategoryKey[]];

export const SOFTWARE = [
  "Premiere Pro",
  "After Effects",
  "DaVinci Resolve",
  "Final Cut Pro",
  "CapCut",
  "Photoshop",
  "Cinema 4D",
  "Blender",
  "Alight Motion",
  "VN",
] as const;

export const LEVELS = ["BEGINNER", "MIDDLE", "PRO"] as const;
export type Level = (typeof LEVELS)[number];

export const PAYMENT_METHODS = ["VISA", "UZCARD", "HUMO"] as const;
/** Admin sozlamalarida nechtagacha to'lov kartasi qo'shish mumkin */
export const MAX_PAYMENT_CARDS = 4;

export const LIMITS = {
  portfolioItems: 30,
  services: 10,
  uploadBytes: 5 * 1024 * 1024,
  pageSize: 24,
};

/**
 * Portfolio videolari (saytning o'ziga yuklanadi va sahifada o'ynaydi).
 * Yuklangan asl fayl serverda 720p H.264 MP4 ga siqiladi (1 daqiqa ≈ 15–20 MB) va asl nusxa o'chiriladi:
 * 200 montajor × 5 video ≈ 1000 video ≈ 15–20 GB disk.
 */
export const VIDEO = {
  /** Bitta montajor nechta video yuklay oladi */
  perEditor: 5,
  /** Eng uzun video (soniya) */
  maxSeconds: 60,
  /** Yuklanadigan asl faylning eng katta hajmi */
  maxUploadBytes: 200 * 1024 * 1024,
  /**
   * Fayl shu hajmdagi bo'laklarda yuboriladi: uzilsa — faqat shu bo'lak qayta yuboriladi.
   * Har bir bo'lak proksi vaqt chegarasiga (Traefik ~60 s) sig'ishi kerak: 2 MB ≈ 0.3 Mbit/s sekin internetda ham o'tadi.
   */
  chunkBytes: 2 * 1024 * 1024,
  /** Siqilgan videoning uzun tomoni (px): 1280 = 720p (gorizontal 1280×720, vertikal 720×1280) */
  maxSide: 1280,
};

/** Test uchun to'lov kartalari — admin paneldan o'zgartiriladi */
export const DEFAULT_CARDS = [
  { type: "VISA", number: "4000 1234 5678 9010", holder: `${SITE_NAME.toUpperCase()} TEST`, bank: "Test bank" },
  { type: "UZCARD", number: "8600 1234 5678 9012", holder: `${SITE_NAME.toUpperCase()} TEST`, bank: "Test bank" },
];

export const isOnline = (lastSeenAt: Date | string | null | undefined) =>
  !!lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS;
