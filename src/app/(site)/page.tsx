import { Avatar } from "@/components/avatar";
import { AvailableToast } from "@/components/home/available-toast";
import { Hero } from "@/components/home/hero";
import {
  CategoriesSection,
  FaqSection,
  FinalCta,
  HowItWorks,
  PromoSection,
  RatingSection,
  ShowcaseStrip,
  SoftwareMarquee,
  StatsStrip,
  TiersSection,
  TopEditorsSection,
} from "@/components/home/sections";
import { getHomeStats, getPlans, getTierCounts, getTiers, getTopEditors } from "@/lib/data";
import { getDict } from "@/lib/i18n";

export default async function HomePage() {
  const [d, stats, top, tiers, counts, plans] = await Promise.all([
    getDict(),
    getHomeStats(),
    getTopEditors(8),
    getTiers(),
    getTierCounts(),
    getPlans(),
  ]);
  const available = top.find((e) => e.isAvailable);

  return (
    <>
      <Hero d={d} stats={stats} />
      <SoftwareMarquee />
      <StatsStrip d={d} s={stats} />
      <div className="h-20" />
      <HowItWorks d={d} />
      <TiersSection d={d} tiers={tiers} counts={counts} />
      <CategoriesSection d={d} />
      <TopEditorsSection d={d} editors={top} />
      <ShowcaseStrip d={d} />
      <RatingSection d={d} />
      <PromoSection d={d} plans={plans} />
      <FaqSection d={d} />
      <FinalCta d={d} />
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
    </>
  );
}
