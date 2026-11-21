import type { Metadata } from "next";
import { PageHero } from "@/components/page-bits";
import { getDict, getLocale } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [d, locale] = await Promise.all([getDict(), getLocale()]);
  return pageMeta({ title: d.footer.privacy, description: d.meta.description, path: "/privacy", locale });
}

// Qisqa namunaviy matn — ishga tushirishdan oldin yurist bilan to'ldiring
export default async function PrivacyPage() {
  const d = await getDict();
  return (
    <>
      <PageHero title={d.footer.privacy} />
      <article className="container-x mt-10 max-w-3xl space-y-5 leading-relaxed text-muted">
        <p>Google orqali kirganda biz faqat ismingiz, email manzilingiz va profil rasmingizni olamiz. Parolingiz bizga hech qachon kelmaydi.</p>
        <p>To&apos;lov cheklari faqat admin va to&apos;lov egasiga ko&apos;rinadi. Yuklangan rasmlardan metama&apos;lumotlar (EXIF, joylashuv) avtomatik o&apos;chiriladi.</p>
        <p>Ma&apos;lumotlaringiz uchinchi shaxslarga sotilmaydi. Akkauntni o&apos;chirish uchun admin bilan bog&apos;laning.</p>
      </article>
    </>
  );
}
