import type { ClubLanding, LandingSession } from "./bookingApi";

/** Найти сессию по id в актуальном ответе /landing (только если ещё доступна для записи). */
export function findBookableSession(
  landing: ClubLanding,
  sessionId: string
): LandingSession | null {
  const seen = new Set<string>();
  const candidates: LandingSession[] = [];
  for (const s of landing.nextSlot?.sessions ?? []) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      candidates.push(s);
    }
  }
  for (const s of landing.weekSchedule) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      candidates.push(s);
    }
  }
  const found = candidates.find((s) => s.id === sessionId);
  return found?.bookable ? found : null;
}
