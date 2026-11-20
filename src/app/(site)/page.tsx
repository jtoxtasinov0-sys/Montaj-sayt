import { Avatar } from "@/components/avatar";
import { AvailableToast } from "@/components/home/available-toast";
import { Hero } from "@/components/home/hero";
import { ScrollRibbon } from "@/components/home/scroll-ribbon";
import {
  CategoriesSection,
  FaqSection,
  FinalCta,
  HowItWorks,
  PromoSection,
  ReviewsSection,
  ShowcaseSection,
  SoftwareMarquee,
  StatsStrip,
  TiersSection,
  TopEditorsSection,
} from "@/components/home/sections";
import { HOME_TOP_COUNT } from "@/lib/constants";
import { getHomeStats, getPlans, getRecentReviews, getTierCounts, getTiers, getTopEditors } from "@/lib/data";
import { getDict } from "@/lib/i18n";

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

  return (
    // isolate + relative: skroll lentasi (-z-10) shu blok ichida, kontent ortida chiziladi
    <div className="relative isolate">
      <ScrollRibbon />
      <Hero d={d} />
      <SoftwareMarquee />
      <StatsStrip d={d} s={stats} />
      <TopEditorsSection d={d} editors={top} />
      <TiersSection d={d} tiers={tiers} counts={counts} />
      <ShowcaseSection d={d} />
      <CategoriesSection d={d} />
      {/* "Qanday ishlaydi" — sherik taklifi bilan pastroqqa tushirildi */}
      <HowItWorks d={d} />
      <PromoSection d={d} plans={plans} />
      <ReviewsSection d={d} items={reviews} />
      {/* Ko'tariladigan qorong'i panel (cuberto.com uslubi); ichida doim qorong'i ranglar */}
      <div data-rb="via" data-rb-x={0.35} data-rb-y={0.06} className="rise-panel dark">
        <FaqSection d={d} first />
        <FinalCta d={d} />
      </div>
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
