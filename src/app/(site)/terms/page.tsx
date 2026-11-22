import type { Metadata } from "next";
import { PageHero } from "@/components/page-bits";
import { SITE_NAME } from "@/lib/constants";
import { getDict, getLocale } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [d, locale] = await Promise.all([getDict(), getLocale()]);
  return pageMeta({ title: d.footer.terms, description: d.meta.description, path: "/terms", locale });
}

// Qisqa namunaviy matn — ishga tushirishdan oldin yurist bilan to'ldiring
export default async function TermsPage() {
  const d = await getDict();
  return (
    <>
      <PageHero title={d.footer.terms} back={{ href: "/", label: d.common.back }} />
      <article className="container-x mt-10 max-w-3xl space-y-5 leading-relaxed text-muted">
        <p>
          {SITE_NAME} — videomontajorlar va mijozlarni bog&apos;laydigan platforma. Platforma montajor va mijoz o&apos;rtasidagi kelishuvning
          tomoni emas; ish sifati, muddat va to&apos;lov bo&apos;yicha javobgarlik tomonlarning o&apos;zida.
        </p>
        <p>Foydalanuvchi o&apos;ziga tegishli yoki foydalanish huquqi bor materiallarni joylashi shart. Soxta baholar, spam va firibgarlik taqiqlanadi — akkaunt bloklanadi.</p>
        <p>TOP joylashuv uchun to&apos;lov tanlangan muddatga (odatda 10 kun) beriladi va qaytarilmaydi, admin to&apos;lovni rad etgan holatlar bundan mustasno.</p>
        <p>Platforma qoidalarni oldindan ogohlantirib o&apos;zgartirish huquqini saqlab qoladi.</p>
      </article>
    </>
  );
}
