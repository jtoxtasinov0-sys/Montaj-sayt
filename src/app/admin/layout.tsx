import { eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { DashNav } from "@/components/dash-nav";
import { SiteHeader } from "@/components/site-header";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/current";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [{ n: pending }] = await db.select({ n: sql<number>`count(*)::int` }).from(payments).where(eq(payments.status, "PENDING"));
  const items = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/payments", label: "To'lovlar", badge: pending },
    { href: "/admin/editors", label: "Montajorlar" },
    { href: "/admin/users", label: "Foydalanuvchilar" },
    { href: "/admin/orders", label: "Buyurtmalar" },
    { href: "/admin/reviews", label: "Baholar" },
    { href: "/admin/plans", label: "TOP rejalar" },
    { href: "/admin/settings", label: "Sozlamalar" },
    { href: "/admin/audit", label: "Audit log" },
  ];
  return (
    <>
      <SiteHeader overDark={false} />
      <div className="container-x pt-28 pb-20">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h1 className="h-hero text-4xl">Boshqaruv</h1>
          <p className="text-xs text-muted">{admin.email}</p>
        </div>
        <div className="glass sticky top-[68px] z-30 -mx-1 mb-8 rounded-full p-1">
          <DashNav items={items} />
        </div>
        {children}
      </div>
    </>
  );
}
