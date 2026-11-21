import { CopyButton } from "@/components/form";
import { SITE_NAME } from "@/lib/constants";
import type { PaymentCard } from "@/lib/data";
import { cn } from "@/lib/utils";

/* Haqiqiy bank kartasi ko'rinishi: ISO o'lcham (85.6 × 54 mm → 1.586), chip, kontaktsiz belgisi, to'lov tizimi nomi.
   Ichidagi hamma o'lchamlar kartaning kengligiga (cqw) bog'langan — telefonda ham, kompyuterda ham bir xil ko'rinadi.
   Sayt oq-qora, shuning uchun kartalar ham to'q: tizimlar bir-biridan faqat ozgina sovuq/iliq tus bilan farq qiladi. */
const SKINS: Record<string, string> = {
  VISA: "from-[#2a2b30] via-[#111114] to-[#050506]",
  UZCARD: "from-[#2a3038] via-[#13171c] to-[#060709]",
  HUMO: "from-[#35312b] via-[#181613] to-[#080706]",
};

/** "8600123456789012" → "8600 1234 5678 9012" (admin raqamni bo'sh joysiz yozsa ham) */
export function formatCardNumber(number: string) {
  const digits = number.replace(/\D/g, "");
  return digits.length >= 12 ? digits.replace(/(\d{4})(?=\d)/g, "$1 ") : number.trim();
}

function Chip({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 50 38" aria-hidden className="h-auto w-[13cqw] drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f1f1" />
          <stop offset="0.45" stopColor="#b4b4b4" />
          <stop offset="0.7" stopColor="#dcdcdc" />
          <stop offset="1" stopColor="#9d9d9d" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="49" height="37" rx="7" fill={`url(#${id})`} />
      <g fill="none" stroke="rgba(0,0,0,0.32)" strokeWidth="1">
        <path d="M17 .5V12.5M33 .5V12.5M17 25.5V37.5M33 25.5V37.5" />
        <path d="M.5 12.5H14a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H.5M49.5 12.5H36a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h13.5" />
        <path d="M17 19h16" />
        <rect x="0.5" y="0.5" width="49" height="37" rx="7" />
      </g>
    </svg>
  );
}

function Contactless() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-auto w-[6.5cqw] text-white/75">
      <path d="M7 9.2a4.5 4.5 0 0 1 0 5.6" />
      <path d="M10.8 7a8.2 8.2 0 0 1 0 10" />
      <path d="M14.6 4.8a12 12 0 0 1 0 14.4" />
      <path d="M18.4 2.6a15.8 15.8 0 0 1 0 18.8" />
    </svg>
  );
}

/** To'lov tizimi nomi — kartaning o'ng pastki burchagida, haqiqiy kartalardagidek */
function NetworkMark({ type }: { type: string }) {
  const t = type.toUpperCase();
  if (t === "VISA") return <span className="text-[8cqw] leading-none font-black tracking-[-0.03em] italic">VISA</span>;
  if (t === "MASTERCARD")
    return (
      <span aria-label="Mastercard" className="flex">
        <span className="h-[8cqw] w-[8cqw] rounded-full bg-white/85" />
        <span className="-ml-[3.2cqw] h-[8cqw] w-[8cqw] rounded-full bg-white/45" />
      </span>
    );
  return <span className="text-[5cqw] leading-none font-extrabold tracking-[0.06em]">{t}</span>;
}

export function PaymentCardView({ card, index, holderLabel, copyLabel, copiedLabel }: {
  card: PaymentCard;
  index: number;
  holderLabel: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const number = formatCardNumber(card.number);
  return (
    <div>
      <div className="@container">
        <div
          aria-label={`${card.type} ${number}`}
          className={cn(
            "relative isolate flex aspect-[1.586] flex-col justify-between overflow-hidden rounded-[5cqw] bg-gradient-to-br p-[6.5cqw] text-white",
            "shadow-[0_24px_48px_-24px_rgba(0,0,0,0.55),0_2px_6px_rgba(0,0,0,0.18)] ring-1 ring-white/10 ring-inset",
            SKINS[card.type.toUpperCase()] ?? SKINS.VISA,
          )}
        >
          {/* Yorug'lik aksi va bezak doiralari — plastik/metall hissi uchun */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_0%_0%,rgba(255,255,255,0.17),transparent_55%)]"
          />
          <svg
            aria-hidden
            viewBox="0 0 200 200"
            fill="none"
            stroke="currentColor"
            className="pointer-events-none absolute -right-[22%] -bottom-[58%] -z-10 w-[88%] text-white/[0.07]"
          >
            <circle cx="100" cy="100" r="99" />
            <circle cx="100" cy="100" r="80" />
            <circle cx="100" cy="100" r="61" />
            <circle cx="100" cy="100" r="42" />
          </svg>

          <div className="flex items-start justify-between gap-[4cqw]">
            <span className="truncate text-[4.4cqw] leading-tight font-medium tracking-wide text-white/90">{card.bank || SITE_NAME}</span>
            <Contactless />
          </div>

          <div>
            <Chip id={`card-chip-${index}`} />
            <p className="mt-[4.5cqw] font-mono text-[6.3cqw] leading-none tracking-[0.07em] whitespace-nowrap tabular-nums [text-shadow:0_1px_0_rgba(0,0,0,0.7),0_-1px_0_rgba(255,255,255,0.14)]">
              {number}
            </p>
          </div>

          <div className="flex items-end justify-between gap-[4cqw]">
            <div className="min-w-0">
              <p className="text-[2.7cqw] tracking-[0.16em] text-white/55 uppercase">{holderLabel}</p>
              <p className="mt-[1.2cqw] truncate text-[4.1cqw] leading-tight font-medium tracking-[0.08em] uppercase">{card.holder}</p>
            </div>
            <NetworkMark type={card.type} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <CopyButton text={number} label={copyLabel} done={copiedLabel} />
      </div>
    </div>
  );
}
