import { desc, ilike, or } from "drizzle-orm";
import { adminSetRole, adminSetUserStatus } from "@/actions/admin";
import { AdminHead, AdminSearch, shortDay, Table } from "@/components/admin-bits";
import { Avatar } from "@/components/avatar";
import { ActionForm, SubmitButton } from "@/components/form";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/current";
import { escapeLike } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireAdmin();
  const q = (await searchParams).q?.trim().slice(0, 80);
  const like = q ? `%${escapeLike(q)}%` : null;
  const rows = await db
    .select()
    .from(users)
    .where(like ? or(ilike(users.email, like), ilike(users.name, like)) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(100);

  return (
    <>
      <AdminHead
        title="Foydalanuvchilar"
        text="Saytga Google orqali kirgan hamma: mijozlar ham, montajorlar ham. Bloklangan odam saytga kira olmaydi va profili yashiriladi. Admin qilingan odam shu panelni to'liq boshqaradi."
      />
      <AdminSearch action="/admin/users" q={q} placeholder="Email yoki ism" />
      <Table head={["Foydalanuvchi", "Rol", "Holat", "Ro'yxatdan o'tgan", "Amallar"]} empty={rows.length === 0}>
        {rows.map((u) => (
          <tr key={u.id} className="align-top">
            <td className="px-4 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={u.name || u.email} image={u.image} size={32} />
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                  {u.telegram && <p className="text-xs text-muted">@{u.telegram}</p>}
                </div>
              </div>
            </td>
            <td className="px-4 py-4">
              {u.role === "ADMIN" ? <span className="chip chip-primary">Admin</span> : <span className="chip">Oddiy</span>}
            </td>
            <td className="px-4 py-4">
              {u.status === "BANNED" ? <span className="chip text-danger">Bloklangan</span> : <span className="chip chip-success">Faol</span>}
              {u.bannedReason && <p className="mt-1 text-xs text-muted">{u.bannedReason}</p>}
            </td>
            <td className="px-4 py-4 text-xs text-muted">
              {shortDay(u.createdAt)}
              {u.lastLoginAt && <p>oxirgi kirish: {shortDay(u.lastLoginAt)}</p>}
            </td>
            <td className="space-y-1.5 px-4 py-4">
              {u.id !== me.id && (
                <>
                  {u.status === "ACTIVE" ? (
                    <ActionForm
                      action={adminSetUserStatus.bind(null, u.id, "BANNED")}
                      confirmText="Bloklansinmi? Barcha sessiyalari o'chiriladi."
                      className="flex gap-1"
                    >
                      <input name="reason" placeholder="Sabab" maxLength={200} className="input !h-8 w-28 !px-2 text-xs" />
                      <SubmitButton size="sm" variant="danger" className="!h-8 text-xs">
                        Bloklash
                      </SubmitButton>
                    </ActionForm>
                  ) : (
                    <ActionForm action={adminSetUserStatus.bind(null, u.id, "ACTIVE")}>
                      <SubmitButton size="sm" variant="ghost" className="!h-8 text-xs">
                        Blokdan chiqarish
                      </SubmitButton>
                    </ActionForm>
                  )}
                  <ActionForm
                    action={adminSetRole.bind(null, u.id, u.role === "ADMIN" ? "USER" : "ADMIN")}
                    confirmText={u.role === "ADMIN" ? "Admin huquqi olinsinmi?" : "Admin qilinsinmi? To'liq boshqaruv huquqini oladi."}
                  >
                    <SubmitButton size="sm" variant="ghost" className="!h-8 text-xs">
                      {u.role === "ADMIN" ? "Adminlikdan olish" : "Admin qilish"}
                    </SubmitButton>
                  </ActionForm>
                </>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
