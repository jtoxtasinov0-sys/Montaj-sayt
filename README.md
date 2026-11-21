# Montaj Club — videomontajorlar platformasi

Boshlang‘ich montajordan professionalgacha: portfolio, narx, halol reyting va buyurtmalar bitta joyda.
Asosiy til — **o‘zbekcha**, qo‘shimcha — **ruscha** va **inglizcha**. Dizayn — minimal oq-qora: asosiy mavzu **oq**, bitta tugma bilan **qora**ga almashadi.

## Imkoniyatlar

**Montajorlar uchun**
- Gmail (Google) orqali kirish — parol yo‘q
- Profil: ism, daraja (boshlang‘ich / o‘rta / professional), tajriba, shahar, boshlang‘ich narx, dasturlar, yo‘nalishlar
- Telegram, Telegram kanal, Instagram, YouTube havolalari
- Portfolio (YouTube/Vimeo sahifaning o‘zida ochiladi; Instagram, Telegram, Drive — havola) + muqova rasmi
- Xizmatlar va narxlar (narxni montajor o‘zi belgilaydi)
- Narx bo‘limlaridagi ($20–30, $30–40, $40–50, $50+) ochiq buyurtmalarga taklif yuborish
- **TOP ga chiqish**: bitta tarif — **50 000 so‘m / 7 kun**, **20 ta joy** (admin paneldan o‘zgaradi). TOP montajorlarning hammasi bosh sahifada ko‘rinadi, tartib **har 30 daqiqada** navbat bilan almashadi
  - **To‘lov kodi:** “TOP ga chiqish” bosilganda shaxsiy summa chiqadi — narxga 100–999 so‘m qo‘shiladi (masalan 50 000 → 50 437). Joy 24 soat band turadi; to‘lanmasa o‘zi bekor bo‘ladi
  - **Avtomatik tasdiqlash:** kartaga aynan shu summa tushgani haqidagi bank xabari kelsa — TOP o‘zi yoqiladi, chek shart emas (pastda “Avtomatik to‘lov”). Chek — faqat zaxira yo‘l (admin qo‘lda tekshiradi)
- Profil rasmi: kabinetda rasm ustiga bosib almashtiriladi, doira ichida surib/kattalashtirib kesiladi

**Mijozlar uchun**
- Montajor katalogi: narx bo‘limi, yo‘nalish, daraja, qidiruv, saralash
- To‘g‘ridan-to‘g‘ri buyurtma yoki ochiq e’lon (takliflar keladi, eng yaxshisini tanlaysiz)
- Natijani qabul qilish yoki qayta ishlashga yuborish
- Ish tugagach **baho**: sifat (1–5) va muloqot (1–5). “O‘z vaqtida” avtomatik hisoblanadi

**Reyting** (0–100 ball) — pul bilan emas, ish bilan:
- 60% — Bayes o‘rtacha bahosi (kam baholi yangi montajorlar ham adolatli ko‘rinadi)
- 25% — o‘z vaqtida topshirilgan ishlar ulushi
- 15% — yakunlangan ishlar soni
- Katalog tartibi: avval TOP, keyin reyting balli. TOPdagilar **har 30 daqiqada navbat bilan** almashadi: n kishi bo‘lsa, har biri n×30 daqiqada bir marta 1-o‘rinda turadi
- Bosh sahifada reyting foizlari ko‘rsatilmaydi (oddiy foydalanuvchiga ortiqcha) — hisob-kitob ichkarida qoladi

**Admin panel** (`/admin`, faqat adminlarga ko‘rinadi — boshqalarga 404)
- Dashboard: tushum, foydalanuvchilar, buyurtmalar statistikasi
- To‘lovlar: chekni ko‘rish, tasdiqlash / rad etish (sabab bilan)
- Montajorlar: tasdiqlash (✓ belgisi), yashirish, qo‘lda TOP berish / olib tashlash
- Foydalanuvchilar: bloklash (barcha sessiyalari o‘chadi), admin qilish
- Buyurtmalar, baholar (yashirish → reytingdan chiqadi), TOP rejalar, to‘lov kartalari, narx bo‘limlari
- Audit log — kim, qachon, nima qildi

**Telegram bot** (admin uchun)
- Yangi to‘lov → admin chatga chek rasmi bilan xabar + **✅ Tasdiqlash / ❌ Rad etish** tugmalari
- `/stats` — statistika, `/pending` — kutilayotgan to‘lovlar, `/start` — chat ID ni ko‘rsatadi
- Tugmalarni faqat `TELEGRAM_ADMIN_IDS` dagi odamlar bosa oladi

## Texnologiyalar

| Qism | Tanlov | Nega |
|---|---|---|
| Frontend + backend | Next.js 16 (App Router, Server Actions), React 19 | SEO, tez, bitta loyiha |
| Dizayn | Tailwind CSS 4, Delight (lotin) + Onest (kirill uchun) | Minimal oq-qora uslub, o‘z serverimizdan yuklanadigan shriftlar |
| Ma’lumotlar bazasi | PostgreSQL 16 + Drizzle ORM | Ishonchli, tez, SQL-injection’dan himoyalangan |
| Login | O‘zimizning Google OAuth (PKCE) + DB sessiyalar | Uchinchi tomon kutubxonasiga bog‘liq emas, sessiyani darhol bekor qilish mumkin |
| Rasmlar | sharp (WEBP ga qayta kodlash) | Kichik hajm, EXIF/zararli kod tozalanadi |
| Deploy | Docker + Dokploy (Hostinger VPS) | |

## Lokal ishga tushirish

```bash
npm install
```

```bash
cp .env.example .env
```

`.env` da `DATABASE_URL=postgres://...`, `APP_URL=http://localhost:3000`, `ALLOW_DEV_LOGIN=true` qo‘ying, so‘ng:

```bash
npm run dev
```

Migratsiyalar server ishga tushganda avtomatik qo‘llanadi. Demo ma’lumotlar (12 montajor, buyurtmalar, baholar):

```bash
npm run db:seed-demo
```

Demo ma’lumotni o‘chirish: `npm run db:seed-demo -- --reset`. Google kalitlarisiz `/login` sahifasida “Dev kirish” orqali istalgan email bilan kirish mumkin (faqat localhost’da). `ADMIN_EMAILS` dagi email bilan kirsangiz — admin bo‘lasiz.

## Deploy: Hostinger VPS + Dokploy

**VPS tavsiyasi:** Hostinger **KVM 2** (2 vCPU, 8 GB RAM) boshlash uchun yetarli; o‘sganda KVM 4.

1. **Dokploy o‘rnating** (Hostinger’da “Dokploy” shablonli VPS bor yoki `curl -sSL https://dokploy.com/install.sh | sh`).
2. **Ma’lumotlar bazasi:** Dokploy → *Create Service → Database → PostgreSQL 16*. “Internal Connection URL” ni nusxalang. Dokploy’da **avtomatik backup** (S3) ni yoqing.
3. **Ilova:** *Create Service → Application* → GitHub repo → **Build Type: Dockerfile**.
4. **Environment** bo‘limiga `.env.example` dagi qiymatlarni yozing (`DATABASE_URL` = 2-qadamdagi URL).
5. **Volume:** *Advanced → Mounts* → Volume, mount path: `/app/uploads` (avatarlar, muqovalar, cheklar shu yerda saqlanadi — **majburiy**, aks holda har deployda o‘chadi).
6. **Domen:** *Domains* → domeningiz, port `3000`, HTTPS (Let’s Encrypt) yoqilgan.
7. **Deploy** tugmasi. Tekshirish: `https://montajclub.com/api/health` → `{"ok":true}`.

Muqobil: hammasini bitta `docker-compose.yml` bilan (Dokploy → *Docker Compose* yoki oddiy `docker compose up -d --build`).

### Google login sozlash
1. [console.cloud.google.com](https://console.cloud.google.com) → yangi loyiha → *APIs & Services → OAuth consent screen* (External, ilova nomi, email).
2. *Credentials → Create credentials → OAuth client ID → Web application*.
3. **Authorized redirect URI:** `https://montajclub.com/api/auth/google/callback`
4. Client ID va Secret ni `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` ga yozing.

### Telegram bot sozlash
Sayt `https://` domenda ishlayotgan bo‘lishi kerak (Telegram oddiy `http` yoki IP manzilga xabar yubormaydi).

1. Telegram’da [@BotFather](https://t.me/BotFather) → `/newbot` → bot nomi (masalan *Montaj Club Admin*) va username (oxiri `bot` bilan tugaydi). BotFather bergan **tokenni** `TELEGRAM_BOT_TOKEN` ga yozing.
2. `TELEGRAM_WEBHOOK_SECRET` ga uzun tasodifiy satr yozing (`openssl rand -hex 32` yoki istalgan 40+ harf/raqam).
3. Dokploy’da shu ikkisini **Environment** ga qo‘shib, **qayta deploy** qiling.
4. Saytga admin Gmail bilan kiring → **Admin → Sozlamalar → “Webhookni ulash”** → “Webhook ulandi ✅”.
5. Botingizni oching va `/start` yozing — bot **Chat ID** va **Sizning ID** ni yozadi.
   - Xabarlar bir nechta adminga kelsin desangiz: Telegram’da guruh oching, botni qo‘shing va guruhda `/start` yozing — guruhning Chat ID si (minus bilan boshlanadi) chiqadi.
6. Chat ID ni `TELEGRAM_ADMIN_CHAT_ID` ga, tugmani bosa oladigan odamlarning ID larini `TELEGRAM_ADMIN_IDS` ga (vergul bilan) yozib, **qayta deploy** qiling.
7. **Admin → Sozlamalar → “Test xabar”** — botdan xabar kelsa, tayyor.

Shundan keyin har bir yangi to‘lov chek rasmi bilan botga keladi: bankda summani (kodni) ko‘rib **✅ Tasdiqlash** ni bossangiz, TOP darhol yoqiladi.

### Avtomatik to‘lov
Har bir to‘lov summasi noyob (narx + 100–999 so‘m kod), shuning uchun bankdagi summa to‘lovchini aniq ko‘rsatadi. So‘nggi 24 soatda tasdiqlangan summa yangi to‘lovga berilmaydi, shu summadagi takror bank xabari esa o‘sha eski to‘lovga bog‘lanadi — bitta pul ikki marta TOP yoqmaydi. Pul tushgani haqidagi xabar ikki yo‘l bilan keladi:

1. **To‘liq avtomatik:** `.env` ga `PAYMENT_WEBHOOK_SECRET` (uzun tasodifiy satr) yozing. Kartaga SMS keladigan Android telefonga “SMS forwarder” (webhook) ilovasini o‘rnatib, bankdan keladigan SMS’larni `POST https://montajclub.com/api/payments/incoming?key=<PAYMENT_WEBHOOK_SECRET>` ga yuboring (yoki kalitni `X-Payment-Secret` sarlavhasida). Tana — JSON, forma yoki oddiy matn.
2. **Bir bosishda:** bank bildirishnomasini (CardXabar, HUMO bot va h.k.) admin Telegram botga forward qiling — bot summani topib, to‘lovni tasdiqlaydi.

Balans qatorlari (“Dostupno”, “Остаток”, “💰”) va chiqim xabarlari (“Списание”, “Oplata”) hisobga olinmaydi. Tushgan summalar `incoming_transfers` jadvalida saqlanadi: pul to‘lov yaratilishidan oldin tushsa ham keyin moslanadi.

### To‘lov kartalari
Hozir test kartalar turibdi (VISA `4000 1234 5678 9010`, UZCARD `8600 1234 5678 9012`). **Admin → Sozlamalar → To‘lov kartalari** dan o‘zingizning haqiqiy kartangizni kiriting.

## SEO va havola ko‘rinishi

- Har bir ochiq sahifada sarlavha, tavsif, kalit so‘zlar, `canonical` va Open Graph / Twitter teglari (`src/lib/seo.ts`, matnlar — `src/lib/i18n/*.ts` → `meta`)
- Google uchun JSON-LD: bosh sahifada `WebSite` + `Organization` (logo), montajor sahifasida `ProfessionalService` (rasm, shahar, narx, baho, ijtimoiy tarmoqlar)
- `sitemap.xml` (barcha ochiq montajorlar bilan), `robots.txt`, `manifest.webmanifest`
- Ikonka: oq-qora “play” belgisi — `src/app/icon.svg` (brauzer qorong‘i rejimida ranglar almashadi), `favicon.ico`, `apple-icon.png`, `public/icon-*.png`
- **Havola rasmi:** bosh sahifa — `public/images/og-home-v3.jpg`; montajor profili — `src/app/(site)/editors/[slug]/opengraph-image.tsx` har bir profil uchun rasm, ism, narx va baho bilan avtomatik chizadi (shriftlar: `assets/og/`)
- Telegram havola rasmini bir necha kun saqlaydi. Yangilash: [@WebpageBot](https://t.me/WebpageBot) ga havolani yuboring

**Google’da chiqish uchun (bir marta):**
1. [search.google.com/search-console](https://search.google.com/search-console) → *Add property* → **Domain** → `montajclub.com`
2. Google bergan `google-site-verification=...` TXT yozuvini Porkbun → DNS’ga qo‘shing (Type `TXT`, Host bo‘sh) → *Verify*
3. *Sitemaps* → `sitemap.xml` → *Submit*
4. Yandex uchun: [webmaster.yandex.ru](https://webmaster.yandex.ru) → saytni qo‘shing → *Meta tag* qiymatini `YANDEX_VERIFICATION` ga yozib qayta deploy qiling → *Sitemap* qo‘shing

## Ko‘p foydalanuvchiga chidamlilik (1000+ bir vaqtda)

- **Barcha CPU yadrolari:** `server-cluster.cjs` har bir yadro uchun alohida Next.js jarayonini ishga tushiradi; biri qulasa — avtomatik qayta tug‘iladi.
- **Mikro-kesh:** tizimga kirmagan mehmonlarning ochiq sahifalari (bosh sahifa, katalog, profillar, buyurtmalar ro‘yxati) 10 soniya xotirada saqlanadi. Bir vaqtda kelgan 1000 so‘rov uchun sahifa **bir marta** render qilinadi. Kirgan foydalanuvchilar, formalar, API — keshlanmaydi.
- **DB:** barcha so‘rovlar uchun indekslar, ulanishlar puli, ko‘p o‘qiladigan ma’lumotlar uchun qisqa kesh, profil ko‘rishlari 30 soniyada bir marta yoziladi.
- **Rasmlar:** WEBP, `lazy` yuklash; sahifa og‘irligi gzip bilan ~30 KB.

**Yuklama testi** (3 ishchi, test generatori bilan bir mashinada, 4 vCPU):

| Holat | Bir vaqtdagi ulanishlar | Natija | Xatolar |
|---|---|---|---|
| Optimallashtirishdan oldin, bosh sahifa | 200 | ~33 so‘rov/s, 4 s kechikish | 28 timeout |
| Mehmonlar, bosh sahifa | 500 | **~2 000 so‘rov/s**, p50 271 ms | 0 |
| Mehmonlar, montajor profili | 500 | **~3 100 so‘rov/s**, p50 167 ms | 0 |
| Kirgan foydalanuvchi (keshsiz), bosh sahifa | 100 | ~100 so‘rov/s | 0 |

1000 ta bir vaqtdagi tashrif buyuruvchi odatda sekundiga 50–150 sahifa so‘rovi degani — bu zaxira bilan qoplanadi.

**Qo‘shimcha tavsiya:** domenni **Cloudflare** (bepul) orqali ulang — statik fayllar CDN’dan beriladi, DDoS himoyasi qo‘shiladi.

## Xavfsizlik

- Google OAuth + PKCE + `state` tekshiruvi; sessiya tokeni faqat `HttpOnly`, `Secure`, `SameSite=Lax`, `__Host-` cookie’da, bazada esa faqat SHA-256 xeshi
- Bloklangan foydalanuvchining barcha sessiyalari darhol o‘chadi
- Admin panel — har bir sahifa va har bir amalda alohida rol tekshiruvi; adminlar emasga 404
- Server Actions — Next.js’ning o‘rnatilgan CSRF (Origin) himoyasi; barcha kiritmalar `zod` bilan tekshiriladi
- Rate-limit: login, buyurtma, taklif, to‘lov, yuklash va IP bo‘yicha umumiy limit
- Fayl yuklash: hajm (5 MB), “magic bytes” tekshiruvi, sharp bilan qayta kodlash, tasodifiy nom, path traversal himoyasi; to‘lov cheklari faqat egasi va adminga
- Holat o‘tishlari (qabul, topshirish, yakunlash) — bitta atomar SQL `UPDATE ... WHERE status=...`; to‘lov tasdiqlash — `SELECT ... FOR UPDATE` tranzaksiyasi (ikki marta tasdiqlanmaydi)
- Qattiq HTTP sarlavhalar: CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy
- Telegram webhook — maxfiy token bilan; tugmalar faqat ruxsat etilgan ID larga
- Docker: root bo‘lmagan foydalanuvchi, ma’lumotlar bazasi tashqariga ochilmagan
- Audit log: barcha admin va to‘lov amallari

## Keyingi bosqich uchun tavsiyalar

1. **Avtomatik to‘lov:** Payme / Click merchant API — TOP to‘lovi va montajor–mijoz o‘rtasida xavfsiz (escrow) to‘lov
2. **Platforma ichida chat** (buyurtma bo‘yicha xabarlar) va Telegram orqali montajorga bildirishnoma
3. **Video yuklash** — Cloudflare R2 / Stream (VPS diskini band qilmaslik uchun)
4. Mijozlar uchun shikoyat/nizolar bo‘limi, montajor sertifikatlari
5. Redis — bir nechta serverga kengayganda rate-limit va kesh uchun

## Foydali buyruqlar

| Buyruq | Vazifa |
|---|---|
| `npm run dev` | Lokal server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript tekshiruvi |
| `npm run db:generate` | `src/db/schema.ts` o‘zgargach yangi migratsiya yaratish |
| `npm run db:migrate` | Migratsiyani qo‘lda qo‘llash |
| `npm run db:seed-demo` | Demo ma’lumotlar |

Ikonkalar Gemini (`gemini-2.5-flash-image`) yordamida ingichka chiziqli qilib chizilgan, potrace bilan vektorlashtirilgan va bitta SVG spraytda: `public/images/icons/glyphs-v2.svg`. Ikonka almashtirilsa — yangi fayl nomi bering (`glyphs-v3.svg`), aks holda brauzerlar eskisini ko‘rsatadi.
