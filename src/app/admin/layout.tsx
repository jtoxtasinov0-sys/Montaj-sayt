import { eq, sql } from "drizzle-orm";
import { ArrowUpRight, ClipboardList, Clapperboard, CreditCard, Flame, History, LayoutGrid, Settings, Star, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DashNav } from "@/components/dash-nav";
import { SiteHeader } from "@/components/site-header";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/current";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const i = "h-4 w-4";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [{ n: pending }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(payments)
    .where(eq(payments.status, "PENDING"));
  const items = [
    { href: "/admin", label: "Umumiy", icon: <LayoutGrid className={i} /> },
    { href: "/admin/payments", label: "To'lovlar", badge: pending, icon: <CreditCard className={i} /> },
    { href: "/admin/plans", label: "TOP tarif", icon: <Flame className={i} /> },
    { href: "/admin/editors", label: "Montajorlar", icon: <Clapperboard className={i} /> },
    { href: "/admin/users", label: "Foydalanuvchilar", icon: <Users className={i} /> },
    { href: "/admin/orders", label: "Buyurtmalar", icon: <ClipboardList className={i} /> },
    { href: "/admin/reviews", label: "Baholar", icon: <Star className={i} /> },
    { href: "/admin/settings", label: "Sozlamalar", icon: <Settings className={i} /> },
    { href: "/admin/audit", label: "Tarix", icon: <History className={i} /> },
  ];
  return (
    <>
      <SiteHeader />
      <div className="container-x pt-28 pb-20">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Admin</p>
            <h1 className="h-hero mt-2 text-4xl">Boshqaruv paneli</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip h-8 px-3 text-xs">{admin.email}</span>
            <Link href="/" className="btn btn-ghost btn-sm">
              Saytga o&apos;tish <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="glass sticky top-[68px] z-30 -mx-1 mb-8 rounded-full p-1">
          <DashNav items={items} />
        </div>
        {children}
      </div>
    </>
  );
}
