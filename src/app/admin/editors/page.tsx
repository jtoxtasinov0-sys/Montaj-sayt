import { requireAdmin } from "@/lib/auth/current";
import { desc, eq, ilike, or } from "drizzle-orm";
import { BadgeCheck, Flame } from "lucide-react";
import Link from "next/link";
import { adminGrantBoost, adminRemoveBoost, adminToggleEditor } from "@/actions/admin";
import { AdminHead, AdminSearch, shortDay, Table } from "@/components/admin-bits";
import { Avatar } from "@/components/avatar";
import { ActionForm, SubmitButton } from "@/components/form";
import { db } from "@/db";
import { editorProfiles, users } from "@/db/schema";
import { daysLeft, escapeLike } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminEditors({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin(); // har bir sahifada alohida tekshiruv (faqat layout'ga ishonmaymiz)
  const q = (await searchParams).q?.trim().slice(0, 80);
  const like = q ? `%${escapeLike(q)}%` : null;
  const rows = await db
    .select({ e: editorProfiles, email: users.email, image: users.image })
    .from(editorProfiles)
    .innerJoin(users, eq(users.id, editorProfiles.userId))
    .where(like ? or(ilike(editorProfiles.displayName, like), ilike(editorProfiles.slug, like), ilike(users.email, like)) : undefined)
    .orderBy(desc(editorProfiles.boostWeight), desc(editorProfiles.score))
    .limit(100);
  const now = new Date();

  return (
    <>
      <AdminHead
        title="Montajorlar"
        text={
          <>
            Profil ochgan montajorlar. <b className="font-medium text-fg">TOP berish</b> — to&apos;lovsiz, qo&apos;lda (aksiya, sovg&apos;a yoki
            kompensatsiya uchun): necha kunligini yozing. <b className="font-medium text-fg">Tasdiqlash</b> — ism yonida ✓ belgisi chiqadi.{" "}
            <b className="font-medium text-fg">Yashirish</b> — profil saytda ko&apos;rinmaydi.
          </>
        }
      />
      <AdminSearch action="/admin/editors" q={q} placeholder="Ism, havola yoki email" />
      <Table head={["Montajor", "Reyting", "Ishlar", "TOP", "Holat", "Amallar"]} empty={rows.length === 0}>
        {rows.map(({ e, email, image }) => {
          const boosted = e.boostWeight > 0 && e.boostUntil && e.boostUntil > now;
          return (
            <tr key={e.id} className="align-top">
              <td className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <Avatar name={e.displayName} avatarKey={e.avatarKey} image={image} size={36} />
                  <div className="min-w-0">
                    <Link href={`/editors/${e.slug}`} className="inline-flex items-center gap-1 font-medium hover:underline hover:underline-offset-4">
                      {e.displayName}
                      {e.isVerified && <BadgeCheck className="h-3.5 w-3.5" />}
                    </Link>
                    <p className="text-xs text-muted">{email}</p>
                    <p className="text-xs text-muted">${e.priceFrom} dan</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                {e.ratingCount ? `${e.ratingAvg.toFixed(1)} ★` : "—"}
                <p className="text-xs text-muted">{e.ratingCount} ta baho</p>
              </td>
              <td className="px-4 py-4">
                {e.completedOrders}
                <p className="text-xs text-muted">{e.onTimeOrders} tasi vaqtida</p>
              </td>
              <td className="px-4 py-4">
                {boosted ? (
                  <div className="mb-2">
                    <span className="chip chip-accent">
                      <Flame className="h-3 w-3" /> TOP
                    </span>
                    <p className="mt-1 text-xs text-muted">
                      {daysLeft(e.boostUntil!)} kun qoldi · {shortDay(e.boostUntil!)} gacha
                    </p>
                    <ActionForm action={adminRemoveBoost.bind(null, e.id)} confirmText="TOP olib tashlansinmi?" className="mt-1">
                      <SubmitButton size="sm" variant="ghost" className="!h-7 text-xs">
                        Olib tashlash
                      </SubmitButton>
                    </ActionForm>
                  </div>
                ) : (
                  <p className="mb-2 text-xs text-muted">TOP&apos;da emas</p>
                )}
                <ActionForm action={adminGrantBoost.bind(null, e.id)} className="flex flex-wrap items-center gap-1.5 [&>p]:basis-full">
                  <input
                    name="days"
                    type="number"
                    min={1}
                    max={90}
                    defaultValue={7}
                    aria-label="Necha kun"
                    className="input !h-8 w-14 !px-2 text-center text-xs"
                  />
                  <span className="text-xs text-muted">kun</span>
                  <SubmitButton size="sm" className="!h-8 text-xs">
                    {boosted ? "Uzaytirish" : "TOP berish"}
                  </SubmitButton>
                </ActionForm>
              </td>
              <td className="space-y-1 px-4 py-4">
                {e.isVerified && <span className="chip chip-primary">Tasdiqlangan</span>}
                {e.isHidden && <span className="chip text-danger">Yashirin</span>}
                {!e.isPublished && <span className="chip">Nashr qilinmagan</span>}
                {!e.isVerified && !e.isHidden && e.isPublished && <span className="text-xs text-muted">Oddiy</span>}
              </td>
              <td className="space-y-1.5 px-4 py-4">
                <ActionForm action={adminToggleEditor.bind(null, e.id, "isVerified")} hideMessage>
                  <SubmitButton size="sm" variant="ghost" className="!h-8 w-full text-xs">
                    {e.isVerified ? "Tasdiqni olish" : "Tasdiqlash ✓"}
                  </SubmitButton>
                </ActionForm>
                <ActionForm action={adminToggleEditor.bind(null, e.id, "isHidden")} hideMessage>
                  <SubmitButton size="sm" variant="ghost" className="!h-8 w-full text-xs">
                    {e.isHidden ? "Ko'rsatish" : "Yashirish"}
                  </SubmitButton>
                </ActionForm>
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
