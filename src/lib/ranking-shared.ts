/** Server va klientda ishlatiladigan reyting yordamchilari (DB'siz) */
export function isTopRated(e: { ratingAvg: number; ratingCount: number; completedOrders: number; onTimeOrders: number }) {
  return e.ratingCount >= 5 && e.ratingAvg >= 4.7 && e.completedOrders > 0 && e.onTimeOrders / e.completedOrders >= 0.9;
}

/**
 * Reyting balli (0–100):
 *  - 60% — Bayes o'rtacha bahosi (kam baholi yangi montajorlar ham adolatli ko'rinadi)
 *  - 25% — o'z vaqtida topshirish ulushi
 *  - 15% — yakunlangan ishlar soni (50 tagacha)
 */
export function computeScore(s: { ratingAvg: number; ratingCount: number; completed: number; onTime: number }) {
  const PRIOR = 4.2;
  const C = 3;
  const bayes = (C * PRIOR + s.ratingAvg * s.ratingCount) / (C + s.ratingCount);
  const onTimeRate = s.completed > 0 ? s.onTime / s.completed : 0;
  const exp = Math.min(s.completed, 50) / 50;
  return Math.round(((bayes / 5) * 60 + onTimeRate * 25 + exp * 15) * 100) / 100;
}
