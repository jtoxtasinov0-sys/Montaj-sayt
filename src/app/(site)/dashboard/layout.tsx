import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { Avatar } from "@/components/avatar";
import { DashNav } from "@/components/dash-nav";
import { Stars } from "@/components/stars";
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
      <section className="dark relative isolate mx-2 mt-2 overflow-hidden rounded-[2rem] border border-line bg-[#05050f] text-fg sm:mx-3">
        <Stars className="absolute inset-0 -z-10 opacity-50" />
        <div aria-hidden className="absolute -top-32 left-1/3 -z-10 h-72 w-[40rem] rounded-full bg-primary/25 blur-[100px]" />
        <div className="container-x flex flex-col gap-6 pt-28 pb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={user.name || user.email} avatarKey={editor?.avatarKey} image={user.image} size={56} />
              <div>
                <h1 className="h-hero text-3xl sm:text-4xl">{fmt(d.dashboard.hello, { name: user.name.split(" ")[0] || "👋" })}</h1>
                <p className="text-sm text-muted">{user.email}</p>
              </div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="btn btn-ghost btn-sm">
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">{d.common.logout}</span>
              </button>
            </form>
          </div>
          <DashNav items={items} />
        </div>
      </section>
      <div className="container-x mt-8">{children}</div>
    </>
  );
}
