import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { SITE_NAME } from "@/lib/constants";
import { getEditorBySlug } from "@/lib/data";
import { env } from "@/lib/env";
import { fmt } from "@/lib/i18n/fmt";
import { uz } from "@/lib/i18n/uz";
import { readUpload } from "@/lib/uploads";
import { uploadUrl } from "@/lib/uploads-url";
import { initials } from "@/lib/utils";

/**
 * Montajor profili havolasi yuborilganda (Telegram, Instagram, Facebook...) chiqadigan rasm:
 * profil rasmi, ism, yo'nalish, daraja, narx va baho — sayt uslubida oq-qora.
 * Havolani ochuvchi botlar cookie yubormaydi, shuning uchun yozuvlar asosiy til (o'zbekcha) da.
 */
export const alt = `${SITE_NAME} — videomontajor`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Profil o'zgarsa rasm ham yangilansin (Telegram baribir o'zida bir necha kun saqlaydi)
export const dynamic = "force-dynamic";

const FG = "#0a0a0a";
const MUTED = "#6b6b6b";
const LINE = "#e3e3e3";

/** Satori faqat ttf/otf/woff o'qiydi — assets/og dagi statik nusxalar (src/app/fonts/delight.woff2 dan olingan) */
let fontsP: Promise<{ name: string; data: Buffer; weight: 300 | 400 | 600; style: "normal" }[]> | null = null;
function loadFonts() {
  const dir = join(process.cwd(), "assets/og");
  const f = (file: string, name: string, weight: 300 | 400 | 600) =>
    readFile(join(dir, file)).then((data) => ({ name, data, weight, style: "normal" as const }));
  fontsP ??= Promise.all([
    f("delight-300.ttf", "Delight", 300),
    f("delight-400.ttf", "Delight", 400),
    f("delight-600.ttf", "Delight", 600),
    // Delight'da kirill va ʻ yo'q — ular Onest bilan chiqadi
    f("onest-latin-400.ttf", "OnestLatin", 400),
    f("onest-latin-600.ttf", "OnestLatin", 600),
    f("onest-cyrillic-400.ttf", "OnestCyr", 400),
    f("onest-cyrillic-600.ttf", "OnestCyr", 600),
  ]).catch((e) => {
    fontsP = null;
    throw e;
  });
  return fontsP;
}

/** Profil rasmi → PNG data URL (Satori WEBP o'qimaydi). Faqat o'zimiz yuklagan rasm yoki Google rasmi */
async function avatarDataUrl(avatarKey: string | null, userImage: string | null) {
  try {
    let buf: Buffer | null = null;
    if (uploadUrl(avatarKey)) buf = await readUpload(avatarKey!);
    else if (userImage?.startsWith("https://lh3.googleusercontent.com/")) {
      const res = await fetch(userImage.replace(/=s\d+(-c)?$/, "=s400-c"), { signal: AbortSignal.timeout(3000) });
      if (res.ok) buf = Buffer.from(await res.arrayBuffer());
    }
    if (!buf) return null;
    const png = await sharp(buf).resize(420, 420, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

const clip = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`);

function LogoRow() {
  const host = new URL(env.appUrl).host;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34, letterSpacing: "-0.04em" }}>
        <svg width="46" height="46" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="9" fill={FG} />
          <path d="M12.5 9.6 23 16l-10.5 6.4Z" fill="#fff" />
        </svg>
        <div style={{ display: "flex" }}>
          <span style={{ fontWeight: 300 }}>Montaj</span>
          <span style={{ fontWeight: 600, marginLeft: 8 }}>Club</span>
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 24, color: MUTED }}>{host}</div>
    </div>
  );
}

const Chip = ({ children, solid }: { children: React.ReactNode; solid?: boolean }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      padding: "8px 20px",
      borderRadius: 999,
      fontSize: 24,
      border: `2px solid ${solid ? FG : "#d6d6d6"}`,
      background: solid ? FG : "#fff",
      color: solid ? "#fff" : FG,
      fontWeight: solid ? 600 : 400,
    }}
  >
    {children}
  </div>
);

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [fonts, data] = await Promise.all([loadFonts(), getEditorBySlug(slug).catch(() => null)]);
  const d = uz;
  const base = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column" as const,
    background: "#fff",
    color: FG,
    padding: "52px 64px",
    fontFamily: "Delight, OnestLatin, OnestCyr",
  };
  const opts = { ...size, fonts, headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } };

  const p = data?.profile;
  if (!p || p.isHidden || !p.isPublished) {
    return new ImageResponse(
      (
        <div style={base}>
          <LogoRow />
          <div style={{ display: "flex", flex: 1, alignItems: "center", fontSize: 88, fontWeight: 600, letterSpacing: "-0.05em" }}>
            {d.meta.editorsTitle}
          </div>
        </div>
      ),
      opts,
    );
  }

  const avatar = await avatarDataUrl(p.avatarKey, data.userImage);
  const boosted = p.boostWeight > 0 && p.boostUntil && p.boostUntil > new Date();
  const name = clip(p.displayName, 40);
  const nameSize = name.length > 26 ? 60 : name.length > 18 ? 72 : 84;
  const cats = p.categories.slice(0, 3).map((c) => d.categories[c] ?? c);

  return new ImageResponse(
    (
      <div style={base}>
        <LogoRow />

        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 56 }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- Satori uchun oddiy <img>
            <img src={avatar} width={300} height={300} style={{ borderRadius: 999, border: `2px solid ${LINE}` }} alt="" />
          ) : (
            <div
              style={{
                display: "flex",
                width: 300,
                height: 300,
                borderRadius: 999,
                background: FG,
                color: "#fff",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 120,
                fontWeight: 600,
                letterSpacing: "-0.04em",
              }}
            >
              {initials(p.displayName)}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ display: "flex", fontSize: nameSize, fontWeight: 600, letterSpacing: "-0.05em", lineHeight: 1 }}>{name}</div>
              {p.isVerified && (
                <svg width="52" height="52" viewBox="0 0 24 24">
                  <path
                    fill={FG}
                    d="M12 1.5 14.6 3.3 17.7 3.2 18.7 6.2 21.2 8 20.2 11 21.2 14 18.7 15.8 17.7 18.8 14.6 18.7 12 20.5 9.4 18.7 6.3 18.8 5.3 15.8 2.8 14 3.8 11 2.8 8 5.3 6.2 6.3 3.2 9.4 3.3Z"
                  />
                  <path d="m8 11.2 2.8 2.8L16.2 8.6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            {p.headline && (
              <div style={{ display: "flex", marginTop: 18, fontSize: 32, color: MUTED, lineHeight: 1.25 }}>{clip(p.headline, 90)}</div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28 }}>
              {boosted && <Chip solid>{d.editors.topBadge}</Chip>}
              <Chip>{d.levels[p.level]}</Chip>
              {p.city && <Chip>{clip(p.city, 24)}</Chip>}
              {cats.map((c) => (
                <Chip key={c}>{c}</Chip>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 64, borderTop: `2px solid ${LINE}`, paddingTop: 26 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: 64, fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1 }}>${p.priceFrom}</span>
            <span style={{ fontSize: 28, color: MUTED }}>{d.editors.from}</span>
          </div>
          {p.ratingCount > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 34 }}>
              <svg width="36" height="36" viewBox="0 0 24 24">
                <path fill={FG} d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9Z" />
              </svg>
              <span style={{ fontWeight: 600 }}>{p.ratingAvg.toFixed(1)}</span>
              <span style={{ color: MUTED, fontSize: 28 }}>{fmt(d.editors.reviews, { n: p.ratingCount })}</span>
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 30, color: MUTED }}>{d.editors.newcomer}</div>
          )}
          {p.completedOrders > 0 && (
            <div style={{ display: "flex", fontSize: 30, color: MUTED }}>{fmt(d.editors.jobsDone, { n: p.completedOrders })}</div>
          )}
        </div>
      </div>
    ),
    opts,
  );
}
