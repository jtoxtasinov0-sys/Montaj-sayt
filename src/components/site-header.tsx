import { LayoutDashboard, Shield } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current";
import { getDict, getLocale } from "@/lib/i18n";
import { Avatar } from "./avatar";
import { HeaderShell, MobileMenu, NavPills } from "./header-client";
import { InstallAppButton } from "./pwa";
import { LangSwitcher } from "./lang-switcher";
import { PresencePing } from "./presence-ping";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const [d, locale, user] = await Promise.all([getDict(), getLocale(), getCurrentUser()]);
  const items = [
    { href: "/editors", label: d.nav.editors },
    { href: "/videographers", label: d.nav.videographers },
    { href: "/jobs", label: d.nav.jobs },
    { href: "/#how", label: d.nav.how },
    { href: "/dashboard/promote", label: d.nav.top },
  ];

  const account = user ? (
    <div className="flex items-center gap-2">
      {user.role === "ADMIN" && (
        // Telefonda tor joy: u yerda admin tugmasi menyu ichida va kabinetda bor
        <Link href="/admin" className="btn btn-ghost btn-sm max-sm:hidden" title={d.common.admin}>
          <Shield className="h-4 w-4" />
          {/* lg'da yuqori menyu pillalari chiqadi — joy tor, shuning uchun u yerda faqat belgi */}
          <span className="hidden md:inline lg:hidden xl:inline">{d.common.admin}</span>
        </Link>
      )}
      <Link href="/dashboard" className="btn btn-ghost btn-sm pl-1.5" title={d.common.dashboard}>
        <Avatar name={user.name || user.email} image={user.image} size={28} />
        <span className="hidden sm:inline">{d.common.dashboard}</span>
      </Link>
    </div>
  ) : (
    // 360px dan tor ekranda sig'maydi — u yerda "Kirish" menyu ichida
    <Link href="/login" className="btn btn-primary btn-sm max-[359px]:hidden">
      {d.common.login}
    </Link>
  );

  return (
    <HeaderShell>
      {user && <PresencePing />}
      <div className="container-x flex items-center justify-between gap-3">
        <Logo />
        <NavPills items={items} />
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <LangSwitcher current={locale} label={d.common.language} />
          </div>
          {/* Ilovani o'rnatish: telefonda — faqat belgi, kompyuterda — "O'rnatish" yozuvi bilan.
              390px dan tor ekranda sig'maydi (menyu tugmasi chetga chiqib ketadi) — u yerda menyu ichida bor */}
          <InstallAppButton
            label={d.pwa.install}
            title={d.pwa.footerInstall}
            iconClassName="h-[18px] w-[18px] shrink-0"
            labelClassName="hidden sm:inline lg:hidden xl:inline"
            className="inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-full border border-line text-[0.84rem] font-medium text-fg transition hover:border-fg hover:bg-fg hover:text-bg max-[389px]:hidden sm:px-3.5 lg:px-0 xl:px-3.5"
          />
          <ThemeToggle label={d.common.theme} />
          {account}
          <MobileMenu
            items={[...items, { href: "/orders/new", label: d.nav.postJob }]}
            label={d.common.menu}
            footer={
              <>
                <LangSwitcher current={locale} label={d.common.language} />
                <InstallAppButton label={d.pwa.footerInstall} className="btn btn-ghost btn-lg" iconClassName="h-5 w-5" />
                {user?.role === "ADMIN" && (
                  <Link href="/admin" className="btn btn-ghost btn-lg">
                    <Shield className="h-5 w-5" /> {d.common.admin}
                  </Link>
                )}
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
