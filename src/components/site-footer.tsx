import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { getDict } from "@/lib/i18n";
import { LogoMark } from "./logo";

export async function SiteFooter() {
  const d = await getDict();
  const year = new Date().getFullYear();
  // Katta yozuv nom uzunligiga qarab kichrayadi — har qanday nom kenglikka sig'adi
  const bigVw = Math.min(18.5, 190 / SITE_NAME.length);
  return (
    <footer data-anim className="relative mt-24 overflow-hidden border-t border-line">
      <span className="beam-line" aria-hidden />
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div data-reveal className="max-w-sm">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-lg font-light tracking-tight">{SITE_NAME}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">{d.footer.about}</p>
        </div>
        <div data-reveal style={{ "--d": "100ms" } as React.CSSProperties}>
          <p className="mb-4 text-xs tracking-widest text-muted uppercase">{d.footer.platform}</p>
          <ul className="space-y-2.5 text-sm">
            <li><Link className="hover:text-primary-2" href="/editors">{d.nav.editors}</Link></li>
            <li><Link className="hover:text-primary-2" href="/jobs">{d.nav.jobs}</Link></li>
            <li><Link className="hover:text-primary-2" href="/orders/new">{d.nav.postJob}</Link></li>
            <li><Link className="hover:text-primary-2" href="/dashboard/profile">{d.nav.becomeEditor}</Link></li>
          </ul>
        </div>
        <div data-reveal style={{ "--d": "200ms" } as React.CSSProperties}>
          <p className="mb-4 text-xs tracking-widest text-muted uppercase">{d.footer.company}</p>
          <ul className="space-y-2.5 text-sm">
            <li><Link className="hover:text-primary-2" href="/#how">{d.nav.how}</Link></li>
            <li><Link className="hover:text-primary-2" href="/#top">{d.nav.top}</Link></li>
            <li><Link className="hover:text-primary-2" href="/terms">{d.footer.terms}</Link></li>
            <li><Link className="hover:text-primary-2" href="/privacy">{d.footer.privacy}</Link></li>
          </ul>
        </div>
      </div>
      <div data-reveal="fade" className="container-x" style={{ "--d": "250ms" } as React.CSSProperties}>
        <p
          aria-hidden
          className="h-display pointer-events-none pb-[0.16em] text-center leading-none whitespace-nowrap text-fg/[0.16] select-none [mask-image:linear-gradient(to_bottom,#000_35%,rgba(0,0,0,0.2))]"
          style={{ fontSize: `min(${bigVw}vw, ${(bigVw * 12.8).toFixed(1)}px)` }}
        >
          {SITE_NAME}
        </p>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-6 text-xs text-muted sm:flex-row">
          <span>
            © {year} {SITE_NAME}. {d.footer.rights}
          </span>
          <span>uz · ru · en</span>
        </div>
      </div>
    </footer>
  );
}
