import type { PromotionPlan } from "@/db/schema";

type Plan = Pick<PromotionPlan, "id" | "name" | "weight">;
export type PlanLevel = { level: number; lower: string[]; higher: string[] };

/**
 * TOP ro'yxati avval vazn (boostWeight), keyin reyting bo'yicha tartiblanadi.
 * Har bir reja uchun: ustuvorlik darajasi (1 = eng past vazn) va undan past/yuqori turadigan rejalar nomi.
 */
export function planLevels(plans: Plan[]): Map<number, PlanLevel> {
  const byWeight = [...plans].sort((a, b) => a.weight - b.weight);
  const weights = [...new Set(byWeight.map((p) => p.weight))];
  return new Map(
    plans.map((p) => [
      p.id,
      {
        level: weights.indexOf(p.weight) + 1,
        lower: byWeight.filter((q) => q.weight < p.weight).map((q) => q.name),
        higher: byWeight.filter((q) => q.weight > p.weight).map((q) => q.name),
      },
    ]),
  );
}

/** ["Start", "Pro", "Premium"] → "Start, Pro va Premium" */
export function joinNames(names: string[], and: string) {
  return names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} ${and} ${names.at(-1)}`;
}
