import { ArrowRight, BadgeCheck, Calendar, Camera, Check, Clock, Eye, Flame, FolderOpen, Lock, MapPin, PenLine, Scissors, Star, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { BackButton } from "@/components/back-button";
import { InstagramIcon, TelegramIcon, YoutubeIcon } from "@/components/icons";
import { Empty } from "@/components/page-bits";
import { RatingStars } from "@/components/rating-stars";
import { VideoTile } from "@/components/video-tile";
import { getCurrentUser } from "@/lib/auth/current";
import { isOnline, SITE_NAME } from "@/lib/constants";
import { getContactsHidden, getEditorBySlug } from "@/lib/data";
import { env } from "@/lib/env";
import { fmt, getDict, getLocale } from "@/lib/i18n";
import { isTopRated } from "@/lib/ranking-shared";
import { trackView } from "@/lib/ranking";
import { jsonLdHtml, pageMeta } from "@/lib/seo";
import { uploadUrl } from "@/lib/uploads-url";
import { formatDate } from "@/lib/utils";
import { isTelegramInvite, isVerticalVideo } from "@/lib/video";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [data, d, locale] = await Promise.all([getEditorBySlug(slug), getDict(), getLocale()]);
  if (!data || data.profile.isHidden || !data.profile.isPublished) return { title: "404", robots: { index: false } };
  const p = data.profile;
  // Tavsif: "O'zi haqida" bo'lsa — undan, bo'lmasa daraja/shahar/narx/baho'dan yig'iladi
  const details = [
    p.headline,
    d.levels[p.level],
    p.city,
    `$${p.priceFrom}+`,
    p.ratingCount > 0 ? `★ ${p.ratingAvg.toFixed(1)} (${p.ratingCount})` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const bio = p.bio.replace(/\s+/g, " ").trim();
  const description = bio
    ? truncate(bio, 158)
    : truncate(fmt(d.meta.editorDescription, { name: p.displayName, details, site: SITE_NAME }), 158);
  // Havola rasmi (ism, rasm, narx, baho bilan) — shu papkadagi opengraph-image.tsx chizadi
  return pageMeta({
    title: `${p.displayName} — ${p.headline || d.meta.editorFallbackTitle}`,
    description,
    path: `/editors/${p.slug}`,
    locale,
    type: "profile",
    image: false,
  });
}

function truncate(s: string, max: number) {
  return s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

export default async function EditorProfilePage({ params }: Params) {
  const { slug } = await params;
  const [data, d, locale, me, contactsHidden] = await Promise.all([
    getEditorBySlug(slug),
    getDict(),
    getLocale(),
    getCurrentUser(),
    getContactsHidden(),
  ]);
  if (!data) notFound();
  const p = data.profile;
  const isOwner = me?.id === p.userId;
  if ((p.isHidden || !p.isPublished) && !isOwner && me?.role !== "ADMIN") notFound();
  if (!isOwner) trackView(p.id);

  const boosted = p.boostWeight > 0 && p.boostUntil && p.boostUntil > new Date();
  const onTimePct = p.completedOrders ? Math.round((p.onTimeOrders / p.completedOrders) * 100) : null;
  type LinkItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
  // Bog'lanish (yon panel) va boshqa ishlar havolalari (Portfolio bo'limi ostida).
  // Kontaktlar yashirilgan bo'lsa (standart) — shaxsiy Telegram ko'rsatilmaydi: muloqot faqat sayt ichidagi loyiha xonasida
  const contacts = [
    !contactsHidden && p.telegram && { href: `https://t.me/${p.telegram}`, label: `@${p.telegram}`, icon: TelegramIcon },
  ].filter(Boolean) as LinkItem[];
  const workLinks = [
    p.driveUrl && { href: p.driveUrl, label: d.profile.googleDrive, icon: FolderOpen },
    p.telegramChannel && {
      href: `https://t.me/${p.telegramChannel}`,
      label: isTelegramInvite(p.telegramChannel) ? d.profile.telegramGroup : `t.me/${p.telegramChannel}`,
      icon: TelegramIcon,
    },
    p.instagram && { href: `https://instagram.com/${p.instagram}`, label: `@${p.instagram}`, icon: InstagramIcon },
    p.youtube && { href: p.youtube, label: "YouTube", icon: YoutubeIcon },
  ].filter(Boolean) as LinkItem[];
  const socials = [...contacts, ...workLinks];
  // Reels (vertikal 9:16) — baland kartochkalarda, YouTube (gorizontal 16:9) va havolalar — keng kartochkalarda
  const reels = data.portfolio.filter((it) => isVerticalVideo(it));
  const wide = [
    ...data.portfolio.filter((it) => it.provider === "upload" && !isVerticalVideo(it)),
    ...data.portfolio.filter((it) => it.provider !== "upload"),
  ];

  const avatarSrc = uploadUrl(p.avatarKey) ?? data.userImage ?? null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: p.displayName,
    description: p.headline || p.bio.slice(0, 300),
    url: `${env.appUrl}/editors/${p.slug}`,
    ...(avatarSrc && { image: avatarSrc.startsWith("/") ? `${env.appUrl}${avatarSrc}` : avatarSrc }),
    areaServed: p.city || "Uzbekistan",
    address: { "@type": "PostalAddress", addressCountry: "UZ", ...(p.city && { addressLocality: p.city }) },
    priceRange: `$${p.priceFrom}+`,
    ...(p.categories.length && { knowsAbout: p.categories.map((c) => d.categories[c] ?? c) }),
    ...(socials.length && { sameAs: socials.map((s) => s.href) }),
    ...(p.ratingCount > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAvg, reviewCount: p.ratingCount, bestRating: 5 },
    }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(jsonLd)} />
      <section className="border-b border-line">
        <div className="container-x grid gap-8 pt-24 pb-12 sm:pt-28 lg:grid-cols-[1fr_auto] lg:items-end">
          {/* To'g'ridan-to'g'ri havola bilan ochilsa — katalogga (faqat videograf bo'lsa — videograflar ro'yxatiga) */}
          <BackButton
            fallback={p.roles.includes("videographer") && !p.roles.includes("editor") ? "/videographers" : "/editors"}
            label={d.common.back}
            className="fade-up -mb-2 justify-self-start sm:mb-0 lg:col-span-2"
          />
          <div className="fade-up flex flex-col gap-6 sm:flex-row sm:items-end">
            <div className="relative w-fit">
              <Avatar name={p.displayName} avatarKey={p.avatarKey} image={data.userImage} size={120} className="ring-1 ring-line" />
              <span
                className={`absolute right-1 bottom-1 h-5 w-5 rounded-full border-4 border-bg ${isOnline(data.lastSeenAt) ? "bg-online" : "bg-offline"}`}
                title={isOnline(data.lastSeenAt) ? d.editors.online : d.editors.offline}
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {p.roles.map((r) => (
                  <span key={r} className="chip chip-primary">
                    {r === "videographer" ? <Camera className="h-3 w-3" /> : <Scissors className="h-3 w-3" />} {d.roles[r] ?? r}
                  </span>
                ))}
                <span className="chip">{d.levels[p.level]}</span>
                {boosted && (
                  <span className="chip chip-accent">
                    <Flame className="h-3 w-3" /> {d.editors.topBadge}
                  </span>
                )}
                {isTopRated(p) && (
                  <span className="chip chip-primary">
                    <Trophy className="h-3 w-3" /> {d.editors.topRated}
                  </span>
                )}
                <span className={p.isAvailable ? "chip chip-success" : "chip"}>{p.isAvailable ? d.editors.available : d.editors.busy}</span>
              </div>
              <h1 className="h-hero mt-3 flex items-center gap-3 text-[clamp(2.2rem,5vw,4rem)]">
                {p.displayName}
                {p.isVerified && <BadgeCheck className="h-8 w-8 shrink-0 text-primary-2" aria-label={d.editors.verified} />}
              </h1>
              <p className="mt-2 max-w-2xl text-muted">{p.headline}</p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                {p.city && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {p.city}
                  </span>
                )}
                {p.experienceYears > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" /> {fmt(d.profile.experience, { n: p.experienceYears })}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-4 w-4" /> {p.views} {d.profile.views}
                </span>
              </div>
            </div>
          </div>
          <div className="fade-up flex flex-col items-start gap-3 lg:items-end [animation-delay:.15s]">
            <div className="text-right">
              <span className="text-5xl font-extralight tracking-tighter">${p.priceFrom}</span>
              <span className="ml-1 text-sm text-muted">{d.editors.from}</span>
            </div>
            {isOwner ? (
              <Link href="/dashboard/profile" className="btn btn-ghost btn-lg">
                <PenLine className="h-4 w-4" /> {d.profile.editProfile}
              </Link>
            ) : (
              <Link href={`/orders/new?editor=${p.slug}`} className="btn btn-primary btn-lg pr-2.5">
                {d.profile.order}
                <span className="btn-arrow !mr-0">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* statistika */}
      <div className="container-x mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {
            icon: Star,
            v: p.ratingCount ? p.ratingAvg.toFixed(1) : "—",
            l: fmt(d.editors.reviews, { n: p.ratingCount }),
            extra: p.ratingCount ? <RatingStars value={p.ratingAvg} /> : null,
          },
          { icon: Trophy, v: String(p.completedOrders), l: d.stats.completed },
          { icon: Clock, v: onTimePct !== null ? `${onTimePct}%` : "—", l: d.rating.onTime },
          { icon: Calendar, v: formatDate(data.userCreatedAt, locale), l: d.profile.memberSince },
        ].map((s) => (
          <div key={s.l} className="card p-4 sm:p-5">
            <s.icon className="h-5 w-5 text-primary-2" />
            <div className="mt-4 text-3xl font-light tracking-tight">{s.v}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              {s.l} {s.extra}
            </div>
          </div>
        ))}
      </div>

      <div className="container-x mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-14">
          {p.bio && (
            <section>
              <h2 className="h-section mb-4 text-3xl">{d.profile.about}</h2>
              <p className="leading-relaxed whitespace-pre-line text-muted">{p.bio}</p>
            </section>
          )}

          <section>
            <h2 className="h-section mb-5 text-3xl">{d.profile.portfolio}</h2>
            {data.portfolio.length === 0 && workLinks.length === 0 ? (
              <Empty>{d.profile.noPortfolio}</Empty>
            ) : (
              <div className="space-y-8">
                {reels.length > 0 && (
                  <div>
                    {wide.length > 0 && <p className="mb-3 text-sm text-muted">{d.profile.formatVertical}</p>}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {reels.map((it) => (
                        <VideoTile key={it.id} item={it} categoryLabel={d.categories[it.category]} />
                      ))}
                    </div>
                  </div>
                )}
                {wide.length > 0 && (
                  <div>
                    {reels.length > 0 && <p className="mb-3 text-sm text-muted">{d.profile.formatHorizontal}</p>}
                    <div className="grid gap-5 sm:grid-cols-2">
                      {wide.map((it) => (
                        <VideoTile key={it.id} item={it} categoryLabel={d.categories[it.category]} />
                      ))}
                    </div>
                  </div>
                )}
                {workLinks.length > 0 && (
                  <div>
                    <p className="mb-3 text-sm text-muted">{d.profile.moreWorks}</p>
                    <div className="flex flex-wrap gap-2">
                      {workLinks.map((s) => (
                        <a
                          key={s.href}
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer nofollow ugc"
                          className="inline-flex max-w-full items-center gap-2 rounded-full border border-line px-4 py-2 text-sm transition hover:border-fg"
                        >
                          <s.icon className="h-4 w-4 shrink-0" /> <span className="truncate">{s.label}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section>
            <h2 className="h-section mb-5 text-3xl">
              {d.profile.reviews} <span className="text-muted">({data.reviews.length})</span>
            </h2>
            {data.reviews.length === 0 ? (
              <Empty>{d.profile.noReviews}</Empty>
            ) : (
              <div className="space-y-3">
                {data.reviews.map((r) => (
                  <article key={r.id} className="card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.authorName} size={36} />
                        <div>
                          <p className="text-sm font-medium">{r.authorName}</p>
                          <p className="text-xs text-muted">{r.orderTitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={r.onTime ? "chip chip-success" : "chip"}>{r.onTime ? d.order.onTime : d.order.late}</span>
                        <RatingStars value={r.rating} />
                      </div>
                    </div>
                    {r.comment && <p className="mt-3 text-sm leading-relaxed text-muted">{r.comment}</p>}
                    <p className="mt-3 text-xs text-muted">{formatDate(r.createdAt, locale)}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <h3 className="mb-4 text-lg font-medium">{d.profile.services}</h3>
            {data.services.length === 0 ? (
              <p className="text-sm text-muted">{d.profile.noServices}</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.services.map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium">{s.title}</p>
                      {s.description && <p className="mt-0.5 text-xs text-muted">{s.description}</p>}
                      <p className="mt-1 text-xs text-muted">{fmt(d.profile.delivery, { n: s.deliveryDays })}</p>
                    </div>
                    <span className="shrink-0 text-lg font-light">${s.priceUsd}</span>
                  </li>
                ))}
              </ul>
            )}
            {!isOwner && (
              <Link href={`/orders/new?editor=${p.slug}`} className="btn btn-primary mt-4 w-full">
                {d.profile.order}
              </Link>
            )}
          </div>

          {contactsHidden && !isOwner && (
            <div className="card p-5">
              <h3 className="mb-2 text-lg font-medium">{d.contact.title}</h3>
              <p className="text-sm text-muted">{d.contact.text}</p>
              <ul className="mt-3 space-y-1.5 text-xs text-muted">
                {d.contact.safe.map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-success" /> {t}
                  </li>
                ))}
              </ul>
              <Link href={`/orders/new?editor=${p.slug}`} className="btn btn-ghost mt-4 w-full">
                <Lock className="h-4 w-4" /> {d.contact.cta}
              </Link>
            </div>
          )}

          {contacts.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 text-lg font-medium">{d.profile.contact}</h3>
              <div className="flex flex-col gap-2">
                {contacts.map((s) => (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm transition hover:border-primary-2"
                  >
                    <s.icon className="h-4 w-4 text-primary-2" /> <span className="truncate">{s.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {(p.skills.length > 0 || p.categories.length > 0) && (
            <div className="card space-y-4 p-5">
              {p.categories.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-muted">{d.profileForm.categories}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.categories.map((c) => (
                      <span key={c} className="chip">
                        {d.categories[c] ?? c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {p.skills.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-muted">{d.profile.software}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.skills.map((s) => (
                      <span key={s} className="chip">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
