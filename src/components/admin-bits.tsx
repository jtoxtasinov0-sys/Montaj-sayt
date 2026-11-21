import { Search } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/*
 * Admin panel bloklari. Hamma bloklar — qop-qora karta, oq yozuv (`card card-solid`),
 * xuddi saytdagi montajor kartalaridek: oq fonda aniq ajralib turadi.
 */

/** Sahifa sarlavhasi: nima uchun kerakligi bir-ikki gapda — admin har safar o'ylab o'tirmasin */
export function AdminHead({ title, text, children }: { title: string; text?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{title}</h2>
        {text && <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>}
      </div>
      {children}
    </div>
  );
}

export function AdminStat({
  label,
  value,
  hint,
  icon,
  href,
  alert,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  href?: string;
  /** Qizil nuqta — e'tibor talab qiladi */
  alert?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">{label}</p>
        {icon && (
          <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-muted [&>svg]:h-4 [&>svg]:w-4">
            {icon}
            {alert && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-danger" />}
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-light tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </>
  );
  const cls = "card card-solid block p-5";
  return href ? (
    <Link href={href} className={cn(cls, "transition duration-300 hover:-translate-y-0.5")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Qora blok sarlavhasi (ichida: nom, izoh va o'ng tomonda havola) */
export function PanelTitle({ title, text, href, linkLabel = "Barchasi →" }: { title: string; text?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-medium">{title}</h3>
        {text && <p className="mt-0.5 text-xs text-muted">{text}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-xs text-muted transition hover:text-fg">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export function AdminSearch({ action, q, placeholder, children }: { action: string; q?: string; placeholder: string; children?: React.ReactNode }) {
  return (
    <form method="get" action={action} className="mb-5 flex flex-wrap gap-2">
      <div className="relative min-w-[16rem] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder={placeholder} maxLength={80} className="input pl-10" />
      </div>
      {children}
      <button className="btn btn-primary">Qidirish</button>
    </form>
  );
}

export function FilterTabs({ base, current, items }: { base: string; current?: string; items: { value?: string; label: string; count?: number }[] }) {
  return (
    <div className="mb-5 flex flex-wrap gap-1.5">
      {items.map((it) => (
        <Link
          key={it.label}
          href={it.value ? `${base}?status=${it.value}` : base}
          className={cn("chip h-8 px-3.5 text-xs", current === it.value && "chip-primary")}
        >
          {it.label}
          {it.count !== undefined && <span className="opacity-60">{it.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="card card-solid overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line text-xs text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={h || i} className="px-4 py-3.5 font-normal first:pl-5 last:pr-5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line [&_td:first-child]:pl-5 [&_td:last-child]:pr-5">{children}</tbody>
      </table>
      {empty && <p className="px-5 py-10 text-center text-sm text-muted">Hech narsa topilmadi</p>}
    </div>
  );
}

/** Audit yozuvlari — texnik nom o'rniga oddiy tilda */
const AUDIT_LABEL: Record<string, string> = {
  "auth.login": "Saytga kirdi",
  "boost.grant": "TOP qo'lda berildi",
  "boost.remove": "TOP olib tashlandi",
  "order.cancel": "Buyurtma bekor qilindi",
  "payment.approve": "To'lov tasdiqlandi",
  "payment.auto": "To'lov avtomatik tasdiqlandi",
  "payment.cancel": "To'lov bekor qilindi",
  "payment.create": "TOP uchun to'lov boshlandi",
  "payment.receipt": "Chek yuborildi",
  "payment.reject": "To'lov rad etildi",
  "plan.save": "TOP tarifi o'zgartirildi",
  "review.create": "Baho qoldirildi",
  "review.hide": "Baho yashirildi",
  "review.show": "Baho qayta ko'rsatildi",
  "settings.cards": "To'lov kartalari o'zgartirildi",
  "telegram.webhook": "Telegram bot ulandi",
  "tier.save": "Narx bo'limi o'zgartirildi",
  "editor.toggle.isVerified": "Montajor tasdig'i o'zgartirildi",
  "editor.toggle.isHidden": "Montajor ko'rinishi o'zgartirildi",
  "user.banned": "Foydalanuvchi bloklandi",
  "user.active": "Foydalanuvchi blokdan chiqarildi",
  "user.role.ADMIN": "Admin qilindi",
  "user.role.USER": "Adminlikdan olindi",
};

export const auditLabel = (action: string) => AUDIT_LABEL[action] ?? action;

/** "2026-11-21 19:05" — admin uchun qisqa sana, Toshkent vaqti bilan */
const TASHKENT = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tashkent",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
export const shortDate = (d: Date) => TASHKENT.format(d);
export const shortDay = (d: Date) => TASHKENT.format(d).slice(0, 10);
