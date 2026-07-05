import type { LandingNextSlot, LandingSession } from "../lib/bookingApi";

type Props = {
  sessions: LandingSession[];
  onBook: (session: LandingSession) => void;
};

const MSK_MS = 3 * 60 * 60 * 1000;
const DAY_NAMES = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"] as const;

function moscowDateKey(iso: string): string {
  const msk = new Date(new Date(iso).getTime() + MSK_MS);
  const y = msk.getUTCFullYear();
  const m = String(msk.getUTCMonth() + 1).padStart(2, "0");
  const d = String(msk.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMoscowWeekDayKeys(now = new Date()): string[] {
  const msk = new Date(now.getTime() + MSK_MS);
  const y = msk.getUTCFullYear();
  const mo = msk.getUTCMonth();
  const d = msk.getUTCDate();
  const mskMidnightUtc = Date.UTC(y, mo, d);
  const dow = new Date(mskMidnightUtc).getUTCDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dayUtc = mskMidnightUtc - (daysFromMonday - i) * 86_400_000;
    const dd = new Date(dayUtc);
    keys.push(
      `${dd.getUTCFullYear()}-${String(dd.getUTCMonth() + 1).padStart(2, "0")}-${String(dd.getUTCDate()).padStart(2, "0")}`
    );
  }
  return keys;
}

function formatDayHeader(key: string, dayIndex: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const label = date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return `${DAY_NAMES[dayIndex]}, ${label}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
}

function venueLine(session: LandingSession): string {
  if (!session.venue) return "Площадка уточняется";
  return `${session.venue.city}, ${session.venue.name}`;
}

export function WeekSchedule({ sessions, onBook }: Props) {
  const weekKeys = getMoscowWeekDayKeys();
  const byDay = new Map<string, LandingSession[]>();
  for (const key of weekKeys) byDay.set(key, []);
  for (const s of sessions) {
    const key = moscowDateKey(s.startsAt);
    if (byDay.has(key)) byDay.get(key)!.push(s);
  }

  return (
    <section id="schedule" className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="font-hand text-2xl text-gold">Расписание</p>
        <h2 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">
          Неделя вперёд
        </h2>
        <p className="mt-4 text-cream/70">Понедельник — воскресенье, время московское.</p>
      </div>

      <div className="mt-12 space-y-6">
        {weekKeys.map((key, i) => {
          const daySessions = byDay.get(key) ?? [];
          return (
            <div
              key={key}
              className="rounded-2xl border border-cream/10 bg-gradient-to-b from-felt/40 to-ink/80 p-5 sm:p-6"
            >
              <h3 className="font-display text-xl capitalize text-gold-soft">
                {formatDayHeader(key, i)}
              </h3>
              {daySessions.length === 0 ? (
                <p className="mt-3 text-sm text-cream/45">Игр нет</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {daySessions.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-col gap-3 border-t border-cream/10 pt-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-cream">
                          {formatTime(s.startsAt)}
                          {s.title ? ` · ${s.title}` : ""}
                        </div>
                        <div className="mt-1 text-sm text-cream/65">{venueLine(s)}</div>
                        <div className="mt-1 text-xs text-cream/50">
                          {s.bookable
                            ? `Свободно ${s.seats.free} из ${s.seats.total}`
                            : s.seats.free === 0
                              ? "Мест нет"
                              : s.phase === "CLOSED"
                                ? "Запись закрыта"
                                : "Запись недоступна"}
                        </div>
                      </div>
                      {s.bookable ? (
                        <button
                          type="button"
                          onClick={() => onBook(s)}
                          className="shrink-0 rounded-full border border-gold/40 px-5 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
                        >
                          Записаться
                        </button>
                      ) : (
                        <span className="shrink-0 text-xs uppercase tracking-wider text-cream/35">
                          —
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function formatHeroNextSlotSummary(nextSlot: LandingNextSlot | null): {
  headline: string;
  detail: string | null;
  seatsLabel: string | null;
  bookingClosed: boolean;
} {
  if (!nextSlot || nextSlot.sessions.length === 0) {
    return {
      headline: "Скоро объявим дату",
      detail: null,
      seatsLabel: null,
      bookingClosed: true,
    };
  }

  const when = new Date(nextSlot.startsAt).toLocaleString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });

  const sessions = nextSlot.sessions;
  if (sessions.length === 1) {
    const s = sessions[0]!;
    const venue = s.venue
      ? `${s.venue.city}, ${s.venue.name}`
      : "площадка уточняется";
    return {
      headline: when,
      detail: venue,
      seatsLabel:
        s.seats.total > 0 ? `${s.seats.free} из ${s.seats.total} мест` : null,
      bookingClosed: false,
    };
  }

  const venueParts = sessions.map((s) => {
    const label = s.venue?.name ?? s.venue?.city ?? "площадка";
    return `${label} (${s.seats.free} мест)`;
  });

  return {
    headline: when,
    detail: `${sessions.length} площадки: ${venueParts.join(" · ")}`,
    seatsLabel: null,
    bookingClosed: false,
  };
}
