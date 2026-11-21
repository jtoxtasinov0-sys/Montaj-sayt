import { requireAdmin } from "@/lib/auth/current";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { adminToggleReview } from "@/actions/admin";
import { AdminHead, Table } from "@/components/admin-bits";
import { ActionForm, SubmitButton } from "@/components/form";
import { RatingStars } from "@/components/rating-stars";
import { db } from "@/db";
import { editorProfiles, reviews, users } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminReviews() {
  await requireAdmin(); // har bir sahifada alohida tekshiruv (faqat layout'ga ishonmaymiz)
  const rows = await db
    .select({ r: reviews, author: users.email, editor: editorProfiles.displayName, slug: editorProfiles.slug })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.authorId))
    .innerJoin(editorProfiles, eq(editorProfiles.id, reviews.editorId))
    .orderBy(desc(reviews.createdAt))
    .limit(150);
  return (
    <>
      <AdminHead
        title="Baholar"
        text="Mijozlar ish tugagach qoldirgan baholar. Haqoratli yoki soxta bahoni yashiring — u montajor profilidan va reytingidan chiqariladi. Xohlasangiz keyin qayta ko'rsatasiz."
      />
      <Table head={["Baho", "Izoh", "Montajor", "Muallif", ""]} empty={rows.length === 0}>
        {rows.map(({ r, author, editor, slug }) => (
          <tr key={r.id} className={r.isHidden ? "align-top opacity-50" : "align-top"}>
            <td className="px-4 py-3">
              <RatingStars value={r.rating} />
              <p className="mt-1 text-xs text-muted">
                Sifat {r.quality} · Muloqot {r.communication} · {r.onTime ? "vaqtida" : "kechikkan"}
              </p>
            </td>
            <td className="max-w-sm px-4 py-3 text-xs text-muted">{r.comment || "—"}</td>
            <td className="px-4 py-3">
              <Link href={`/editors/${slug}`} className="hover:underline hover:underline-offset-4">
                {editor}
              </Link>
            </td>
            <td className="px-4 py-3 text-xs">{author}</td>
            <td className="px-4 py-3">
              <ActionForm action={adminToggleReview.bind(null, r.id)} hideMessage>
                <SubmitButton size="sm" variant="ghost" className="!h-8 text-xs">
                  {r.isHidden ? "Ko'rsatish" : "Yashirish"}
                </SubmitButton>
              </ActionForm>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
