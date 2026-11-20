/**
 * DEMO ma'lumotlar (faqat test/ko'rsatish uchun!). Productionda ishlatmang.
 *   npm run db:seed-demo           — demo ma'lumot qo'shish
 *   npm run db:seed-demo -- --reset — demo ma'lumotlarni o'chirish
 * Barcha demo foydalanuvchilar "@montajchi.demo" domenida.
 */
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import sharp from "sharp";
import * as s from "../src/db/schema";
import { computeScore } from "../src/lib/ranking-shared";

const client = postgres(process.env.DATABASE_URL!, { max: 2, onnotice: () => {} });
const db = drizzle(client, { schema: s });
const UPLOAD = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
const DAY = 86_400_000;

async function cover(file: string) {
  const key = `covers/${randomUUID()}.webp`;
  await mkdir(path.join(UPLOAD, "covers"), { recursive: true });
  const src = path.join(process.cwd(), "public/images/stills", file);
  // Kadr rasmlari repoda bo'lmasa — oq-qora oddiy muqova
  const img = existsSync(src)
    ? sharp(src).resize(960)
    : sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="100%" height="100%" fill="#111"/>
  <text x="50%" y="54%" font-size="40" text-anchor="middle" font-family="sans-serif" fill="#fff">${file.replace(/\.webp$/, "")}</text></svg>`));
  await img.webp({ quality: 78 }).toFile(path.join(UPLOAD, key));
  return key;
}

async function receipt() {
  const key = `receipts/${randomUUID()}.webp`;
  await mkdir(path.join(UPLOAD, "receipts"), { recursive: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="100%" height="100%" fill="#f4f4f8"/>
  <text x="50%" y="200" font-size="44" text-anchor="middle" font-family="sans-serif" fill="#0b0b1a">TEST CHEK</text>
  <text x="50%" y="300" font-size="64" text-anchor="middle" font-family="sans-serif" fill="#0b0b1a">50 000 so'm</text>
  <text x="50%" y="400" font-size="30" text-anchor="middle" font-family="sans-serif" fill="#5d5f7a">8600 **** **** 9012</text></svg>`;
  await sharp(Buffer.from(svg)).webp().toFile(path.join(UPLOAD, key));
  return key;
}

const EDITORS = [
  { name: "Aziz Karimov", level: "PRO", price: 45, city: "Toshkent", cats: ["youtube", "ads"], exp: 6, head: "YouTube va reklama montaji, 6 yillik tajriba" },
  { name: "Malika Yusupova", level: "PRO", price: 35, city: "Toshkent", cats: ["reels", "motion"], exp: 4, head: "Trenddagi Reels va dinamik qisqa kliplar" },
  { name: "Jasur Toshmatov", level: "MIDDLE", price: 25, city: "Samarqand", cats: ["youtube", "color"], exp: 3, head: "Klip montaji va kinematografik rang" },
  { name: "Dilnoza Rahimova", level: "PRO", price: 60, city: "Toshkent", cats: ["motion", "ads"], exp: 7, head: "Motion dizayn va 3D animatsiya" },
  { name: "Sardor Aliyev", level: "MIDDLE", price: 22, city: "Buxoro", cats: ["podcast", "youtube"], exp: 2, head: "Podkast va intervyu montaji" },
  { name: "Nodira Xasanova", level: "BEGINNER", price: 12, city: "Farg‘ona", cats: ["reels"], exp: 1, head: "Instagram Reels, tez va arzon" },
  { name: "Bekzod Ergashev", level: "MIDDLE", price: 28, city: "Namangan", cats: ["youtube", "color"], exp: 3, head: "YouTube montaji va DaVinci rang" },
  { name: "Shahzoda Nazarova", level: "BEGINNER", price: 15, city: "Andijon", cats: ["reels", "youtube"], exp: 1, head: "YouTube Shorts va vlog montaji" },
  { name: "Otabek Murodov", level: "PRO", price: 80, city: "Toshkent", cats: ["ads", "motion", "color"], exp: 9, head: "Brendlar uchun premium reklama roliklari" },
  { name: "Kamola Saidova", level: "MIDDLE", price: 38, city: "Toshkent", cats: ["ads", "color"], exp: 4, head: "Hissiyotli imidj roliklar" },
  { name: "Rustam Qodirov", level: "BEGINNER", price: 18, city: "Qarshi", cats: ["podcast", "reels"], exp: 1, head: "Podkastdan qisqa kliplar kesish" },
  { name: "Madina Olimova", level: "MIDDLE", price: 48, city: "Samarqand", cats: ["youtube", "motion"], exp: 5, head: "YouTube kanallar uchun to‘liq montaj" },
] as const;

const STILLS = ["clip.webp", "car.webp", "reels.webp", "podcast-hosts.webp", "travel.webp", "food.webp"];
const SKILLS = ["Premiere Pro", "After Effects", "DaVinci Resolve", "CapCut", "Final Cut Pro", "Photoshop", "Cinema 4D", "Blender"];
const COMMENTS = [
  "Juda tez va sifatli ishladi, rahmat!",
  "Rang korreksiyasi ajoyib chiqdi. Yana buyurtma beraman.",
  "Hammasi kelishilgandek, muloqot zo‘r.",
  "Kichik tuzatishlar bo‘ldi, lekin natija a’lo.",
  "Muddatdan oldin topshirdi 🔥",
  "Professional yondashuv, tavsiya qilaman.",
];

async function reset() {
  await db.delete(s.users).where(like(s.users.email, "%@montajchi.demo"));
  console.log("Demo ma'lumotlar o'chirildi");
}

async function main() {
  if (process.argv.includes("--reset")) return reset();
  const exists = await db.select({ id: s.users.id }).from(s.users).where(like(s.users.email, "%@montajchi.demo")).limit(1);
  if (exists.length) {
    console.log("Demo ma'lumotlar allaqachon bor. Qayta yaratish: npm run db:seed-demo -- --reset && npm run db:seed-demo");
    return;
  }

  const clients = await db
    .insert(s.users)
    .values(
      ["Anvar Mirzayev", "Gulnora Tursunova", "Farrux Abdullayev", "Lola Ismoilova"].map((name, i) => ({
        email: `client${i + 1}@montajchi.demo`,
        name,
        telegram: `client_demo_${i + 1}`,
      })),
    )
    .returning();

  const editorIds: string[] = [];
  for (const [i, e] of EDITORS.entries()) {
    const [u] = await db
      .insert(s.users)
      .values({ email: `editor${i + 1}@montajchi.demo`, name: e.name, createdAt: new Date(Date.now() - (200 - i * 12) * DAY) })
      .returning();
    const slug = e.name.toLowerCase().split(" ")[0].replace(/[^a-z]/g, "") + "-edits";
    const [p] = await db
      .insert(s.editorProfiles)
      .values({
        userId: u.id,
        slug,
        displayName: e.name,
        headline: e.head,
        bio: `Salom! Men ${e.name}. ${e.exp} yildan beri video montaj bilan shug‘ullanaman. Har bir loyihaga ijodiy yondashaman: ritm, rang va ovoz uyg‘unligi — asosiy e’tiborim. Ish jarayonida doim aloqadaman va kelishilgan muddatda topshiraman.`,
        city: e.city,
        level: e.level,
        experienceYears: e.exp,
        priceFrom: e.price,
        categories: [...e.cats],
        skills: SKILLS.filter((_, k) => (k + i) % 3 !== 0).slice(0, 4),
        telegram: `${slug.replace(/-/g, "_")}`,
        telegramChannel: i % 2 === 0 ? `${slug.replace(/-/g, "_")}_works` : null,
        instagram: `${slug.replace(/-/g, ".")}`,
        isAvailable: i % 4 !== 3,
        isVerified: e.level === "PRO",
        createdAt: u.createdAt,
      })
      .returning();
    editorIds.push(p.id);

    await db.insert(s.services).values([
      { editorId: p.id, title: "Reels / Shorts (60 soniyagacha)", description: "Subtitr, musiqa, effektlar", priceUsd: e.price, deliveryDays: 2, sort: 0 },
      { editorId: p.id, title: "YouTube video (10 daqiqagacha)", description: "To‘liq montaj, rang, ovoz", priceUsd: e.price * 3, deliveryDays: 5, sort: 1 },
      ...(i % 2 === 0 ? [{ editorId: p.id, title: "Reklama roliki (30 soniya)", description: "Ssenariy bo‘yicha, 2 ta tuzatish", priceUsd: e.price * 2, deliveryDays: 4, sort: 2 }] : []),
    ]);

    const items = [];
    for (let k = 0; k < 4; k++) {
      const still = STILLS[(i + k) % STILLS.length];
      items.push({
        editorId: p.id,
        title: ["Klip — Registon", "Avto reklama", "Shahar Reels’i", "Podkast epizodi", "Tog‘ sayohati vlog", "Osh — food reklama"][STILLS.indexOf(still)],
        url: `https://t.me/montajchi_demo/${i * 10 + k}`,
        provider: "telegram",
        category: ["other", "ads", "reels", "podcast", "youtube", "ads"][STILLS.indexOf(still)],
        coverKey: await cover(still),
        sort: k,
      });
    }
    await db.insert(s.portfolioItems).values(items);
  }

  // Yakunlangan buyurtmalar va baholar
  let n = 0;
  for (const [i, editorId] of editorIds.entries()) {
    const count = [9, 7, 5, 6, 3, 1, 4, 0, 11, 5, 1, 4][i];
    for (let k = 0; k < count; k++) {
      const client = clients[(i + k) % clients.length];
      const created = new Date(Date.now() - (90 - k * 5) * DAY);
      const deadline = new Date(created.getTime() + 5 * DAY);
      const late = (i + k) % 7 === 0;
      const delivered = new Date(deadline.getTime() + (late ? 1 : -1) * DAY);
      const [o] = await db
        .insert(s.orders)
        .values({
          clientId: client.id,
          editorId,
          title: ["Instagram uchun 5 ta Reels", "YouTube vlog montaji", "To‘y klipi 3 daqiqa", "Mahsulot reklamasi", "Podkast qisqa kliplar"][k % 5],
          description: "Demo buyurtma: materiallar Google Drive’da, uslub — zamonaviy, dinamik.",
          category: EDITORS[i].cats[0],
          budgetUsd: EDITORS[i].price + k * 5,
          agreedPriceUsd: EDITORS[i].price + k * 5,
          deadline,
          status: "COMPLETED",
          isPublic: false,
          deliveryUrl: "https://drive.google.com/demo",
          acceptedAt: created,
          firstDeliveredAt: delivered,
          deliveredAt: delivered,
          completedAt: new Date(delivered.getTime() + DAY),
          createdAt: created,
        })
        .returning();
      const quality = late ? 4 : [5, 5, 4, 5][k % 4];
      const communication = [5, 4, 5, 5][(k + i) % 4];
      await db.insert(s.reviews).values({
        orderId: o.id,
        editorId,
        authorId: client.id,
        quality,
        communication,
        rating: Math.round((quality * 0.7 + communication * 0.3) * 10) / 10,
        onTime: !late,
        comment: COMMENTS[(n++ + i) % COMMENTS.length],
        createdAt: new Date(delivered.getTime() + DAY),
      });
    }
    // statistikani qayta hisoblash
    const [o] = await db
      .select({
        completed: sql<number>`count(*) filter (where ${s.orders.status} = 'COMPLETED')::int`,
        onTime: sql<number>`count(*) filter (where ${s.orders.status} = 'COMPLETED' and ${s.orders.firstDeliveredAt} <= ${s.orders.deadline})::int`,
      })
      .from(s.orders)
      .where(eq(s.orders.editorId, editorId));
    const [r] = await db
      .select({ avg: sql<number>`coalesce(avg(${s.reviews.rating}),0)::float`, c: sql<number>`count(*)::int` })
      .from(s.reviews)
      .where(eq(s.reviews.editorId, editorId));
    const st = { ratingAvg: Math.round(r.avg * 100) / 100, ratingCount: r.c, completed: o.completed, onTime: o.onTime };
    await db
      .update(s.editorProfiles)
      .set({ ratingAvg: st.ratingAvg, ratingCount: st.ratingCount, completedOrders: st.completed, onTimeOrders: st.onTime, score: computeScore(st), views: 40 + i * 37 })
      .where(eq(s.editorProfiles.id, editorId));
  }

  // TOP: 3 ta montajor (yagona reja — bir xil vazn, har 30 daqiqada navbat bilan almashadi)
  const now = Date.now();
  const [topPlan] = await db.select().from(s.promotionPlans).where(eq(s.promotionPlans.isActive, true)).orderBy(s.promotionPlans.sort).limit(1);
  const w = topPlan?.weight ?? 10;
  for (const idx of [3, 1, 8]) {
    await db.insert(s.promotions).values({ editorId: editorIds[idx], weight: w, startsAt: new Date(now - DAY), endsAt: new Date(now + 6 * DAY) });
    await db.update(s.editorProfiles).set({ boostWeight: w, boostUntil: new Date(now + 6 * DAY) }).where(eq(s.editorProfiles.id, editorIds[idx]));
  }

  // Ochiq buyurtmalar (turli narx bo'limlarida)
  const jobs = [
    { t: "Instagram do‘kon uchun 10 ta Reels", b: 15, c: "reels" },
    { t: "Restoran reklamasi — 30 soniya", b: 28, c: "ads" },
    { t: "YouTube kanal uchun haftalik montaj", b: 35, c: "youtube" },
    { t: "Musiqiy klip (Samarqand), 4 daqiqa", b: 45, c: "other" },
    { t: "Logo animatsiyasi va intro", b: 22, c: "motion" },
    { t: "Brend uchun imidj rolik + rang", b: 75, c: "ads" },
    { t: "Podkastdan 8 ta qisqa klip", b: 12, c: "podcast" },
  ];
  for (const [k, j] of jobs.entries()) {
    const [o] = await db
      .insert(s.orders)
      .values({
        clientId: clients[k % clients.length].id,
        title: j.t,
        description:
          "Materiallar tayyor (Google Drive). Zamonaviy, dinamik uslub kerak, subtitrlar bilan. Namuna sifatida bir nechta havola yuboraman. Tajribali montajor bo‘lsa yaxshi.",
        category: j.c,
        budgetUsd: j.b,
        deadline: new Date(now + (5 + k) * DAY),
        status: "OPEN",
        isPublic: true,
        createdAt: new Date(now - k * 7 * 3_600_000),
      })
      .returning();
    const proposers = editorIds.filter((_, idx) => (idx + k) % 4 === 0).slice(0, 3);
    for (const ed of proposers) {
      await db.insert(s.proposals).values({
        orderId: o.id,
        editorId: ed,
        priceUsd: j.b + (k % 3) * 3,
        days: 2 + (k % 4),
        message: "Assalomu alaykum! Shunga o‘xshash loyihalarda ko‘p ishlaganman, portfoliomni ko‘rishingiz mumkin. Kelishilgan muddatda topshiraman.",
      });
    }
    await db.update(s.orders).set({ proposalCount: proposers.length }).where(eq(s.orders.id, o.id));
  }

  // Tekshirilayotgan to'lov (admin panel demo uchun)
  const plan = topPlan;
  const [ed] = await db.select().from(s.editorProfiles).where(eq(s.editorProfiles.id, editorIds[6])).limit(1);
  if (plan && ed) {
    await db.insert(s.payments).values({
      userId: ed.userId,
      editorId: ed.id,
      planId: plan.id,
      planName: plan.name,
      days: plan.days,
      weight: plan.weight,
      amountUzs: plan.priceUzs + 437,
      payCode: 437,
      method: "UZCARD",
      payerNote: "Kartam oxiri 4417",
      receiptKey: await receipt(),
    });
  }
  console.log(`Demo: ${EDITORS.length} montajor, ${clients.length} mijoz, ${jobs.length} ochiq buyurtma qo'shildi.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
