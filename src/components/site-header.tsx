import { LayoutDashboard, Shield } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current";
import { getDict, getLocale } from "@/lib/i18n";
import { Avatar } from "./avatar";
import { HeaderShell, MobileMenu, NavPills } from "./header-client";
import { LangSwitcher } from "./lang-switcher";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader({ overDark = true }: { overDark?: boolean } = {}) {
  const [d, locale, user] = await Promise.all([getDict(), getLocale(), getCurrentUser()]);
  const items = [
    { href: "/editors", label: d.nav.editors },
    { href: "/jobs", label: d.nav.jobs },
    { href: "/#how", label: d.nav.how },
    { href: "/#top", label: d.nav.top },
  ];

  const account = user ? (
    <div className="flex items-center gap-2">
      {user.role === "ADMIN" && (
        <Link href="/admin" className="btn btn-ghost btn-sm" title={d.common.admin}>
          <Shield className="h-4 w-4" />
          <span className="hidden xl:inline">{d.common.admin}</span>
        </Link>
      )}
      <Link href="/dashboard" className="btn btn-ghost btn-sm pl-1.5" title={d.common.dashboard}>
        <Avatar name={user.name || user.email} image={user.image} size={28} />
        <span className="hidden sm:inline">{d.common.dashboard}</span>
      </Link>
    </div>
  ) : (
    <Link href="/login" className="btn btn-primary btn-sm">
      {d.common.login}
    </Link>
  );

  return (
    <HeaderShell overDark={overDark}>
      <div className="container-x flex items-center justify-between gap-3">
        <Logo />
        <NavPills items={items} />
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <LangSwitcher current={locale} label={d.common.language} />
          </div>
          <ThemeToggle label={d.common.theme} />
          {account}
          <MobileMenu
            items={[...items, { href: "/orders/new", label: d.nav.postJob }]}
            label={d.common.menu}
            footer={
              <>
                <LangSwitcher current={locale} label={d.common.language} />
                {user ? (
                  <Link href="/dashboard" className="btn btn-primary btn-lg">
                    <LayoutDashboard className="h-5 w-5" /> {d.common.dashboard}
                  </Link>
                ) : (
                  <Link href="/login" className="btn btn-primary btn-lg">
                    {d.common.login}
                  </Link>
                )}
              </>
            }
          />
        </div>
      </div>
    </HeaderShell>
  );
}
