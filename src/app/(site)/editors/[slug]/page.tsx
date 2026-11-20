import { ArrowRight, BadgeCheck, Calendar, Clock, Eye, Flame, MapPin, PenLine, Star, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { InstagramIcon, TelegramIcon, YoutubeIcon } from "@/components/icons";
import { Empty } from "@/components/page-bits";
import { RatingStars } from "@/components/rating-stars";
import { VideoTile } from "@/components/video-tile";
import { getCurrentUser } from "@/lib/auth/current";
import { getEditorBySlug } from "@/lib/data";
import { env } from "@/lib/env";
import { fmt, getDict, getLocale } from "@/lib/i18n";
import { isTopRated } from "@/lib/ranking-shared";
import { trackView } from "@/lib/ranking";
import { uploadUrl } from "@/lib/uploads-url";
import { formatDate } from "@/lib/utils";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const data = await getEditorBySlug(slug);
  if (!data || data.profile.isHidden || !data.profile.isPublished) return { title: "404" };
  const p = data.profile;
  const img = uploadUrl(p.avatarKey) ?? data.userImage ?? undefined;
  return {
    title: `${p.displayName} — ${p.headline || "Montajor"}`,
    description: p.bio.slice(0, 160) || p.headline,
    alternates: { canonical: `/editors/${p.slug}` },
    openGraph: { title: p.displayName, description: p.headline, images: img ? [img] : undefined },
  };
}

export default async function EditorProfilePage({ params }: Params) {
  const { slug } = await params;
  const [data, d, locale, me] = await Promise.all([getEditorBySlug(slug), getDict(), getLocale(), getCurrentUser()]);
  if (!data) notFound();
  const p = data.profile;
  const isOwner = me?.id === p.userId;
  if ((p.isHidden || !p.isPublished) && !isOwner && me?.role !== "ADMIN") notFound();
  if (!isOwner) trackView(p.id);

  const boosted = p.boostWeight > 0 && p.boostUntil && p.boostUntil > new Date();
  const onTimePct = p.completedOrders ? Math.round((p.onTimeOrders / p.completedOrders) * 100) : null;
  const socials = [
    p.telegram && { href: `https://t.me/${p.telegram}`, label: `@${p.telegram}`, icon: TelegramIcon },
    p.telegramChannel && { href: `https://t.me/${p.telegramChannel}`, label: `t.me/${p.telegramChannel}`, icon: TelegramIcon },
    p.instagram && { href: `https://instagram.com/${p.instagram}`, label: `@${p.instagram}`, icon: InstagramIcon },
    p.youtube && { href: p.youtube, label: "YouTube", icon: YoutubeIcon },
  ].filter(Boolean) as { href: string; label: string; icon: typeof TelegramIcon }[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: p.displayName,
    description: p.headline,
    url: `${env.appUrl}/editors/${p.slug}`,
    areaServed: p.city || "Uzbekistan",
    priceRange: `$${p.priceFrom}+`,
    ...(p.ratingCount > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAvg, reviewCount: p.ratingCount, bestRating: 5 },
    }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="border-b border-line">
        <div className="container-x grid gap-8 pt-32 pb-12 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="fade-up flex flex-col gap-6 sm:flex-row sm:items-end">
            <div className="relative">
              <Avatar name={p.displayName} avatarKey={p.avatarKey} image={data.userImage} size={120} className="ring-1 ring-line" />
              {p.isAvailable && (
                <span className="absolute right-1 bottom-1 h-5 w-5 rounded-full border-4 border-bg bg-fg" title={d.editors.available} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
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
            {data.portfolio.length === 0 ? (
              <Empty>{d.profile.noPortfolio}</Empty>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {data.portfolio.map((it) => (
                  <VideoTile key={it.id} item={it} categoryLabel={d.categories[it.category]} />
                ))}
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

          {socials.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 text-lg font-medium">{d.profile.socials}</h3>
              <div className="flex flex-col gap-2">
                {socials.map((s) => (
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
