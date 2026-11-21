import { Avatar } from "@/components/avatar";
import { AvailableToast } from "@/components/home/available-toast";
import { Hero } from "@/components/home/hero";
import { ScrollRibbon } from "@/components/home/scroll-ribbon";
import {
  FaqSection,
  HowItWorks,
  PromoSection,
  ReviewsSection,
  ShowcaseSection,
  StatsStrip,
  TiersSection,
  TopEditorsSection,
} from "@/components/home/sections";
import type { Metadata } from "next";
import { HOME_TOP_COUNT, SITE_NAME } from "@/lib/constants";
import { getHomeStats, getPlans, getRecentReviews, getTierCounts, getTiers, getTopEditors } from "@/lib/data";
import { env } from "@/lib/env";
import { getDict, getLocale } from "@/lib/i18n";
import { jsonLdHtml, pageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [d, locale] = await Promise.all([getDict(), getLocale()]);
  return pageMeta({ title: d.meta.title, description: d.meta.description, path: "/", locale, absoluteTitle: true });
}

export default async function HomePage() {
  const [d, stats, top, tiers, counts, plans, reviews] = await Promise.all([
    getDict(),
    getHomeStats(),
    getTopEditors(HOME_TOP_COUNT),
    getTiers(),
    getTierCounts(),
    getPlans(),
    getRecentReviews(6),
  ]);
  const available = top.find((e) => e.isAvailable);
  // Google uchun: sayt nomi (qidiruv natijasida "Montaj Club" deb chiqadi) va brend logotipi
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${env.appUrl}/#website`,
        url: `${env.appUrl}/`,
        name: SITE_NAME,
        description: d.meta.description,
        inLanguage: ["uz", "ru", "en"],
        publisher: { "@id": `${env.appUrl}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${env.appUrl}/#organization`,
        name: SITE_NAME,
        url: `${env.appUrl}/`,
        logo: { "@type": "ImageObject", url: `${env.appUrl}/icon-512.png`, width: 512, height: 512 },
        areaServed: "UZ",
      },
    ],
  };

  return (
    // isolate + relative: skroll lentasi (-z-10) shu blok ichida, kontent ortida chiziladi
    <div className="relative isolate">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(jsonLd)} />
      <ScrollRibbon />
      <Hero d={d} />
      <StatsStrip d={d} s={stats} />
      <TopEditorsSection d={d} editors={top} />
      <TiersSection d={d} tiers={tiers} counts={counts} />
      <ShowcaseSection d={d} />
      {/* Ko'p beriladigan savollar — taxlanadigan kartalar (oldin bu yerda yo'nalishlar kartalari edi) */}
      <FaqSection d={d} />
      {/* "Qanday ishlaydi" — sherik taklifi bilan pastroqqa tushirildi */}
      <HowItWorks d={d} />
      <PromoSection d={d} plans={plans} />
      <ReviewsSection d={d} items={reviews} />
      {available && (
        <AvailableToast
          name={available.displayName}
          slug={available.slug}
          avatar={<Avatar name={available.displayName} avatarKey={available.avatarKey} image={available.userImage} size={40} />}
          text={d.hero.toastText}
          cta={d.hero.toastCta}
          closeLabel={d.common.close}
        />
      )}
    </div>
  );
}
