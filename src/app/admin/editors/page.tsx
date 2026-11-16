import { requireAdmin } from "@/lib/auth/current";
import { desc, eq, ilike, or } from "drizzle-orm";
import Link from "next/link";
import { adminGrantBoost, adminRemoveBoost, adminToggleEditor } from "@/actions/admin";
import { AdminSearch, Table } from "@/components/admin-bits";
import { ActionForm, SubmitButton } from "@/components/form";
import { db } from "@/db";
import { editorProfiles, users } from "@/db/schema";
import { escapeLike } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminEditors({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin(); // har bir sahifada alohida tekshiruv (faqat layout'ga ishonmaymiz)
  const q = (await searchParams).q?.trim().slice(0, 80);
  const like = q ? `%${escapeLike(q)}%` : null;
  const rows = await db
    .select({ e: editorProfiles, email: users.email })
    .from(editorProfiles)
    .innerJoin(users, eq(users.id, editorProfiles.userId))
    .where(like ? or(ilike(editorProfiles.displayName, like), ilike(editorProfiles.slug, like), ilike(users.email, like)) : undefined)
    .orderBy(desc(editorProfiles.boostWeight), desc(editorProfiles.score))
    .limit(100);
  const now = new Date();

  return (
    <>
      <AdminSearch action="/admin/editors" q={q} placeholder="Ism, slug yoki email" />
      <Table head={["Montajor", "Reyting", "Ishlar", "TOP", "Holat", "Amallar"]}>
        {rows.map(({ e, email }) => {
          const boosted = e.boostWeight > 0 && e.boostUntil && e.boostUntil > now;
          return (
            <tr key={e.id} className="align-top">
              <td className="px-4 py-3">
                <Link href={`/editors/${e.slug}`} className="font-medium hover:text-primary-2">
                  {e.displayName}
                </Link>
                <p className="text-xs text-muted">{email}</p>
                <p className="text-xs text-muted">${e.priceFrom}+ · {e.level}</p>
              </td>
              <td className="px-4 py-3">
                {e.ratingAvg.toFixed(1)}★ ({e.ratingCount})
                <p className="text-xs text-muted">ball {e.score.toFixed(1)}</p>
              </td>
              <td className="px-4 py-3">
                {e.completedOrders}
                <p className="text-xs text-muted">{e.onTimeOrders} vaqtida</p>
              </td>
              <td className="px-4 py-3">
                {boosted ? (
                  <>
                    <span className="chip chip-accent">vazn {e.boostWeight}</span>
                    <p className="mt-1 text-xs text-muted">{e.boostUntil!.toISOString().slice(0, 10)} gacha</p>
                    <ActionForm action={adminRemoveBoost.bind(null, e.id)} confirmText="TOP olib tashlansinmi?" className="mt-1">
                      <SubmitButton size="sm" variant="ghost" className="!h-7 text-xs">
                        Olib tashlash
                      </SubmitButton>
                    </ActionForm>
                  </>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
                <ActionForm action={adminGrantBoost.bind(null, e.id)} className="mt-2 flex gap-1">
                  <input name="days" type="number" min={1} max={90} defaultValue={10} className="input !h-8 w-14 !px-2 text-xs" title="kun" />
                  <input name="weight" type="number" min={1} max={1000} defaultValue={20} className="input !h-8 w-14 !px-2 text-xs" title="vazn" />
                  <SubmitButton size="sm" className="!h-8 text-xs">
                    + TOP
                  </SubmitButton>
                </ActionForm>
              </td>
              <td className="space-y-1 px-4 py-3">
                {e.isVerified && <span className="chip chip-primary">Tasdiqlangan</span>}
                {e.isHidden && <span className="chip text-danger">Yashirin</span>}
                {!e.isPublished && <span className="chip">Nashr qilinmagan</span>}
              </td>
              <td className="space-y-1.5 px-4 py-3">
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
