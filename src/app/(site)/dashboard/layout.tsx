import { LogOut, Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DashNav } from "@/components/dash-nav";
import { ProfileAvatar } from "@/components/profile-avatar";
import { getEditorProfileByUser, requireUser } from "@/lib/auth/current";
import { fmt, getDict } from "@/lib/i18n";

export const metadata: Metadata = { robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/dashboard");
  const [d, editor] = await Promise.all([getDict(), getEditorProfileByUser(user.id)]);
  const items = [
    { href: "/dashboard", label: d.dashboard.overview },
    { href: "/dashboard/orders", label: d.dashboard.orders },
    { href: "/dashboard/profile", label: d.dashboard.profile },
    ...(editor
      ? [
          { href: "/dashboard/portfolio", label: d.dashboard.portfolio },
          { href: "/dashboard/services", label: d.dashboard.services },
          { href: "/dashboard/promote", label: d.dashboard.promote },
        ]
      : []),
    { href: "/dashboard/settings", label: d.dashboard.settings },
  ];
  return (
    <>
      <section className="border-b border-line">
        <div className="container-x flex flex-col gap-6 pt-28 pb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <ProfileAvatar name={user.name || user.email} avatarKey={editor?.avatarKey} image={user.image} size={56} />
              <div className="min-w-0">
                <h1 className="h-hero text-2xl [overflow-wrap:anywhere] sm:text-4xl">{fmt(d.dashboard.hello, { name: user.name.split(" ")[0] || "👋" })}</h1>
                <p className="truncate text-sm text-muted">{user.email}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {user.role === "ADMIN" && (
                <Link href="/admin" className="btn btn-primary btn-sm" title={d.common.admin} aria-label={d.common.admin}>
                  <Shield className="h-4 w-4" /> <span className="hidden sm:inline">{d.common.admin}</span>
                </Link>
              )}
              <form action="/api/auth/logout" method="post">
                <button className="btn btn-ghost btn-sm" title={d.common.logout} aria-label={d.common.logout}>
                  <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">{d.common.logout}</span>
                </button>
              </form>
            </div>
          </div>
          <DashNav items={items} />
        </div>
      </section>
      <div className="container-x mt-8">{children}</div>
    </>
  );
}
