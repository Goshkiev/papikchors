const apiBase = import.meta.env.VITE_BOOKING_API_URL ?? "http://localhost:4000";

export type PublicSessionLite = {
  id: string;
  title: string;
  startsAt: string;
  registrationClosesAt?: string;
  phase?: "UPCOMING" | "LATE_REGISTRATION" | "CLOSED";
};

export type LandingVenue = {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  nextSession: LandingSession | null;
};

export type LandingSession = {
  id: string;
  title: string;
  startsAt: string;
  registrationClosesAt: string;
  phase: "UPCOMING" | "LATE_REGISTRATION" | "CLOSED";
  venue: { id: string; name: string; city: string; address: string } | null;
  seats: { free: number; total: number };
  bookable: boolean;
};

export type LandingNextSlot = {
  startsAt: string;
  sessions: LandingSession[];
};

export type ClubLanding = {
  club: { name: string; slug: string };
  bookingBaseUrl: string;
  subscriptionExpired: boolean;
  pricing: {
    currency: string;
    entryListCents: number;
    seatPickSurchargeCents: number;
    firstVisitFree: boolean;
  };
  nextSlot: LandingNextSlot | null;
  weekSchedule: LandingSession[];
  venues: LandingVenue[];
};

export type ClubNextSession = {
  club: { name: string; slug: string };
  bookingBaseUrl: string;
  session: PublicSessionLite | null;
  alternateSession: PublicSessionLite | null;
  booking: {
    inProgress: boolean;
    registrationClosesAt: string;
    phase: "UPCOMING" | "LATE_REGISTRATION" | "CLOSED";
  } | null;
  seats: { free: number; total: number } | null;
  pricing: {
    currency: string;
    entryListCents: number;
    seatPickSurchargeCents: number;
    firstVisitFree: boolean;
  };
};

export type PublicOfferBundle = {
  club: { id: string; name: string; slug: string };
  clubOffer: { id: string; version: number; text: string; publishedAt: string } | null;
};

export async function fetchClubLanding(slug: string): Promise<ClubLanding> {
  const res = await fetch(`${apiBase}/api/public/clubs/${encodeURIComponent(slug)}/landing`);
  const text = await res.text();
  const data = text ? (JSON.parse(text) as ClubLanding & { error?: string }) : null;
  if (!res.ok) {
    throw new Error(data?.error ?? `API ${res.status}`);
  }
  return data as ClubLanding;
}

export async function fetchClubNextSession(slug: string): Promise<ClubNextSession> {
  const res = await fetch(`${apiBase}/api/public/clubs/${encodeURIComponent(slug)}/next-session`);
  const text = await res.text();
  const data = text ? (JSON.parse(text) as ClubNextSession & { error?: string }) : null;
  if (!res.ok) {
    throw new Error(data?.error ?? `API ${res.status}`);
  }
  return data as ClubNextSession;
}

export async function fetchPublicOfferBundle(slug: string): Promise<PublicOfferBundle> {
  const res = await fetch(`${apiBase}/api/public/clubs/${encodeURIComponent(slug)}/offer`);
  const text = await res.text();
  const data = text ? (JSON.parse(text) as PublicOfferBundle & { error?: string }) : null;
  if (!res.ok) {
    throw new Error(data?.error ?? `API ${res.status}`);
  }
  return data as PublicOfferBundle;
}

export async function createLandingOfferPreviewToken(slug: string, offerVersionId: string) {
  const res = await fetch(`${apiBase}/api/public/offers/club/accept-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clubSlug: slug,
      offerVersionId,
      accepted: true,
    }),
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as { token?: string; error?: string }) : null;
  if (!res.ok || !data?.token) {
    throw new Error(data?.error ?? `API ${res.status}`);
  }
  return data.token;
}

export function formatSessionWhen(startsAt: string) {
  const d = new Date(startsAt);
  const date = d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

function isSameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function relativeDayHint(event: Date, now = new Date()): string {
  if (isSameLocalCalendarDay(event, now)) return "сегодня";
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameLocalCalendarDay(event, tomorrow)) return "завтра";
  return "";
}

export function formatVenueLine(
  venue: LandingSession["venue"],
  fallback = "Площадка уточняется"
): string {
  if (!venue) return fallback;
  return `${venue.city}, ${venue.name}`;
}

export function sessionToPickerLabel(session: LandingSession): {
  id: string;
  headline: string;
  detail: string;
} {
  const time = new Date(session.startsAt).toLocaleString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
  return {
    id: session.id,
    headline: formatVenueLine(session.venue),
    detail: `${time} · ${session.seats.free} из ${session.seats.total} мест`,
  };
}

export function formatTournamentBookingSummary(opts: {
  startsAt: string | undefined | null;
  registrationClosesAt: string | undefined | null;
  inProgress?: boolean;
}): string | null {
  if (!opts.startsAt || !opts.registrationClosesAt) return null;
  const start = new Date(opts.startsAt);
  const close = new Date(opts.registrationClosesAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(close.getTime())) return null;

  const when = formatSessionWhen(opts.startsAt);
  const rel = relativeDayHint(start);
  const relPrefix = rel ? ` (${rel})` : "";
  const closeWhen = close.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (opts.inProgress) {
    return `Турнир уже идёт${relPrefix}: ${when}. Запись открыта до ${closeWhen}.`;
  }
  return `Ближайший турнир${relPrefix}: ${when}. Запись открыта до ${closeWhen}.`;
}

export function buildBookingLoginUrl(opts: {
  bookingBaseUrl: string;
  sessionId: string;
  name: string;
  phone: string;
  offerPreviewToken?: string;
}) {
  const base = opts.bookingBaseUrl.replace(/\/$/, "");
  const nextParams = new URLSearchParams({ source: "landing" });
  if (opts.offerPreviewToken) nextParams.set("offerToken", opts.offerPreviewToken);
  const next = `/play/${opts.sessionId}?${nextParams.toString()}`;
  const q = new URLSearchParams({
    next,
    name: opts.name,
    phone: opts.phone,
  });
  return `${base}/login?${q.toString()}`;
}
