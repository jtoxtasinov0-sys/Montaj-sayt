"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

type Card = { type: string; number: string; holder: string; bank?: string };
type Slot = { id: number; card: Card | null };

/** Doim ko'rinib turadigan karta joylari soni; qolganlari "Karta qo'shish" tugmasi bilan ochiladi */
const VISIBLE = 2;

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
          <input
            name={`number${i}`}
            defaultValue={slot.card?.number ?? ""}
            placeholder="8600 0000 0000 0000"
            inputMode="numeric"
            autoComplete="off"
            autoFocus={slot.id === state.added}
            className="input !h-10 font-mono"
          />
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
