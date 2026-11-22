"use client";

import { Plus, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

type Card = { type: string; number: string; holder: string; bank?: string };
type Slot = { id: number; card: Card | null };

/** Doim ko'rinib turadigan karta joylari soni; qolganlari "Karta qo'shish" tugmasi bilan ochiladi */
const VISIBLE = 2;
/** Karta raqami uzunligi — server (adminSaveCards) ham aynan 16 ta raqam talab qiladi */
const CARD_DIGITS = 16;

const onlyDigits = (v: string) => v.replace(/\D/g, "");
/** "8600123456789012" → "8600 1234 5678 9012" */
const groupDigits = (digits: string) => digits.replace(/(\d{4})(?=\d)/g, "$1 ");
/** Formatlangan matnda n-raqamdan keyingi pozitsiya (kursor shu yerga qo'yiladi) */
function caretAfterDigits(formatted: string, n: number) {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]) && ++seen === n) return i + 1;
  }
  return formatted.length;
}

/**
 * Karta raqami: faqat raqam, ko'pi bilan 16 ta, yozish/joylash paytida 4 tadan ajratiladi ("8600 1234 5678 9012").
 * Kursor joyida qoladi; bo'sh joy ustida Backspace/Delete — yonidagi raqamni o'chiradi.
 */
function CardNumberInput({ name, defaultValue, autoFocus }: { name: string; defaultValue: string; autoFocus?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  // `n` — har o'zgarishda qayta chizish uchun (qiymat o'zgarmasa ham, masalan harf yoki 17-raqam rad etilganda): kursor joyiga qaytadi
  const [st, setSt] = useState(() => ({ v: groupDigits(onlyDigits(defaultValue).slice(0, CARD_DIGITS)), n: 0 }));
  const caret = useRef<number | null>(null);
  const value = st.v;

  useLayoutEffect(() => {
    const el = ref.current;
    if (caret.current == null || !el || document.activeElement !== el) return;
    el.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  }, [st]);

  /** Raqamlarni yozib, kursorni `digitsBeforeCaret`-raqamdan keyinga qo'yadi */
  const put = (digits: string, digitsBeforeCaret: number) => {
    const next = groupDigits(digits);
    caret.current = caretAfterDigits(next, digitsBeforeCaret);
    setSt((s) => ({ v: next, n: s.n + 1 }));
  };

  const count = onlyDigits(value).length;
  const partial = count > 0 && count < CARD_DIGITS;
  return (
    <div className="relative">
      <input
        ref={ref}
        name={name}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          const all = onlyDigits(raw);
          const before = onlyDigits(raw.slice(0, e.target.selectionStart ?? raw.length)).length;
          const extra = all.length - CARD_DIGITS;
          // 16 ta to'lgan bo'lsa — ortiqcha raqam qo'shilmaydi (oxirgisini surib chiqarmaydi), kursor joyida qoladi
          if (extra > 0 && count >= CARD_DIGITS) return put(onlyDigits(value), before - extra);
          // Uzunroq raqam joylansa — birinchi 16 tasi olinadi
          put(all.slice(0, CARD_DIGITS), Math.min(before, CARD_DIGITS));
        }}
        onKeyDown={(e) => {
          const el = e.currentTarget;
          const start = el.selectionStart ?? 0;
          if (start !== el.selectionEnd) return;
          const digits = onlyDigits(value);
          const before = onlyDigits(value.slice(0, start)).length;
          if (e.key === "Backspace" && value[start - 1] === " ") {
            e.preventDefault();
            put(digits.slice(0, before - 1) + digits.slice(before), before - 1);
          } else if (e.key === "Delete" && value[start] === " ") {
            e.preventDefault();
            put(digits.slice(0, before) + digits.slice(before + 1), before);
          }
        }}
        placeholder="8600 0000 0000 0000"
        inputMode="numeric"
        autoComplete="off"
        // Chala raqam bilan forma yuborilmaydi (bo'sh qoldirish mumkin — bo'sh karta saqlanmaydi)
        pattern="\d{4} \d{4} \d{4} \d{4}"
        title={`Karta raqami — ${CARD_DIGITS} ta raqam`}
        aria-invalid={partial || undefined}
        autoFocus={autoFocus}
        className="input !h-10 pr-16 font-mono tracking-wider"
      />
      {/* Chala kiritilganda — nechta raqam yozilgani ko'rinadi */}
      {partial && (
        <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-muted tabular-nums">
          {count}/{CARD_DIGITS}
        </span>
      )}
    </div>
  );
}

function initial(cards: Card[], max: number): Slot[] {
  const n = Math.min(max, Math.max(VISIBLE, cards.length));
  return Array.from({ length: n }, (_, i) => ({ id: i, card: cards[i] ?? null }));
}

/**
 * Admin → Sozlamalar → To'lov kartalari: maydonlar (forma va "Saqlash" tugmasi sahifaning o'zida).
 * Maydon nomlari type0/number0/holder0/bank0 … — server (adminSaveCards) shu tartibda o'qiydi.
 */
export function PaymentCardFields({ cards, types, max }: { cards: Card[]; types: readonly string[]; max: number }) {
  // Saqlangandan keyin server yangi ro'yxat yuboradi — maydonlarni shundan qayta chizamiz
  const sig = JSON.stringify(cards);
  const [state, setState] = useState(() => ({ sig, gen: 0, next: max, added: -1, slots: initial(cards, max) }));
  if (state.sig !== sig) setState({ sig, gen: state.gen + 1, next: max, added: -1, slots: initial(cards, max) });
  const { slots } = state;

  const add = () =>
    setState((s) => (s.slots.length >= max ? s : { ...s, next: s.next + 1, added: s.next, slots: [...s.slots, { id: s.next, card: null }] }));
  const remove = (id: number) => setState((s) => ({ ...s, slots: s.slots.filter((x) => x.id !== id) }));

  return (
    <>
      {slots.map((slot, i) => (
        <div key={`${state.gen}-${slot.id}`} className="grid gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[132px_1fr]">
          <div className="flex items-center justify-between sm:col-span-2">
            <span className="text-xs text-muted">{i + 1}-karta</span>
            {slots.length > 1 && (
              <button
                type="button"
                onClick={() => remove(slot.id)}
                aria-label={`${i + 1}-kartani olib tashlash`}
                title="Olib tashlash"
                className="grid h-7 w-7 place-items-center rounded-full text-muted transition hover:bg-card-2 hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select name={`type${i}`} defaultValue={slot.card?.type ?? "UZCARD"} className="input !h-10">
            {types.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <CardNumberInput name={`number${i}`} defaultValue={slot.card?.number ?? ""} autoFocus={slot.id === state.added} />
          <input
            name={`holder${i}`}
            defaultValue={slot.card?.holder ?? ""}
            placeholder="Karta egasi"
            autoComplete="off"
            className="input !h-10 sm:col-start-2"
          />
          <input
            name={`bank${i}`}
            defaultValue={slot.card?.bank ?? ""}
            placeholder="Bank (ixtiyoriy)"
            autoComplete="off"
            className="input !h-10 sm:col-start-2"
          />
        </div>
      ))}
      {slots.length < max && (
        <button
          type="button"
          onClick={add}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-sm text-muted transition hover:border-fg hover:text-fg"
        >
          <Plus className="h-4 w-4" />
          Karta qo&apos;shish
        </button>
      )}
    </>
  );
}
