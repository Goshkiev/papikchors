import { useEffect, useState } from "react";
import { z } from "zod";
import {
  buildBookingLoginUrl,
  createLandingOfferPreviewToken,
  fetchPublicOfferBundle,
  sessionToPickerLabel,
  type LandingSession,
  type PublicOfferBundle,
} from "../lib/bookingApi";
import { OfferTextModal } from "./OfferTextModal";
import {
  applyRuPhoneInputChange,
  isRuPhoneComplete,
  ruPhoneToApi,
} from "../lib/phoneMask";

const schema = z.object({
  name: z.string().trim().min(2, "Введите имя").max(80),
  contact: z.string().trim().min(10, "Введите телефон").max(24),
});

type Props = {
  open: boolean;
  onClose: () => void;
  sessions: LandingSession[];
  bookingBaseUrl: string;
  firstVisitFree: boolean;
  clubSlug: string;
};

export function ReservationModal({
  open,
  onClose,
  sessions,
  bookingBaseUrl,
  firstVisitFree,
  clubSlug,
}: Props) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("+7 ");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [offers, setOffers] = useState<PublicOfferBundle | null>(null);
  const [acceptClubOffer, setAcceptClubOffer] = useState(false);
  const [readOffer, setReadOffer] = useState<"club" | null>(null);
  const [pickedSessionId, setPickedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPickedSessionId(sessions[0]?.id ?? null);
    setError(null);
  }, [open, sessions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchPublicOfferBundle(clubSlug)
      .then((r) => {
        if (!cancelled) setOffers(r);
      })
      .catch(() => {
        if (!cancelled) setOffers(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, clubSlug]);

  if (!open) return null;

  const picked = sessions.find((s) => s.id === pickedSessionId) ?? null;
  const pickers = sessions.map(sessionToPickerLabel);
  const showPicker = sessions.length > 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isRuPhoneComplete(contact)) {
      setError("Введите телефон полностью: +7 и 10 цифр");
      return;
    }
    const parsed = schema.safeParse({ name, contact: ruPhoneToApi(contact) });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Проверьте поля");
      return;
    }
    if (!pickedSessionId || !picked) {
      setError("Выберите площадку и игру.");
      return;
    }
    if (!acceptClubOffer) {
      setError("Подтвердите оферту клуба перед продолжением");
      return;
    }
    if (!offers?.clubOffer) {
      setError("Оферта клуба временно недоступна. Попробуйте чуть позже.");
      return;
    }
    setSubmitting(true);
    try {
      const offerPreviewToken = await createLandingOfferPreviewToken(
        clubSlug,
        offers.clubOffer.id
      );
      const url = buildBookingLoginUrl({
        bookingBaseUrl,
        sessionId: pickedSessionId,
        name: parsed.data.name,
        phone: parsed.data.contact,
        offerPreviewToken,
      });
      window.location.href = url;
    } catch {
      setError("Не удалось перейти к записи. Попробуйте ещё раз.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto px-4 pt-4 pb-8 sm:py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reservation-title"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative my-0 w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-gold/30 bg-gradient-to-b from-felt to-ink p-6 sm:my-auto sm:max-h-none sm:overflow-visible sm:p-8 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-4 top-4 text-cream/60 hover:text-gold transition-colors"
        >
          ✕
        </button>
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Запись на игру</p>
          <h3 id="reservation-title" className="font-display text-2xl text-cream">
            {showPicker ? "Выберите площадку" : "Ближайший турнир"}
          </h3>
          {picked && !showPicker && (
            <>
              <p className="mt-1 text-sm text-cream/70">{pickers[0]?.detail}</p>
              <p className="mt-1 text-sm text-cream/80">{pickers[0]?.headline}</p>
            </>
          )}
          {firstVisitFree && (
            <p className="mt-2 text-sm text-gold-soft/90">Первый визит — вход бесплатно.</p>
          )}
        </div>

        {showPicker && (
          <fieldset className="mb-6 space-y-2 border-0 p-0">
            <legend className="mb-2 text-xs uppercase tracking-wider text-cream/50">
              Площадка и время
            </legend>
            {pickers.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  pickedSessionId === p.id
                    ? "border-gold/50 bg-gold/5"
                    : "border-cream/15 bg-ink/50 hover:border-cream/25"
                }`}
              >
                <input
                  type="radio"
                  name="session"
                  value={p.id}
                  checked={pickedSessionId === p.id}
                  onChange={() => setPickedSessionId(p.id)}
                  className="mt-1 accent-gold"
                />
                <span>
                  <span className="block font-medium text-cream">{p.headline}</span>
                  <span className="block text-sm text-cream/65">{p.detail}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {sessions.length === 0 && (
          <p className="mb-6 text-sm text-cream/70">
            Запись пока закрыта. Выберите игру в расписании или загляните позже.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs uppercase tracking-wider text-cream/50 mb-2">
              Имя
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              className="w-full rounded-xl border border-cream/15 bg-ink/70 px-4 py-3 text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition"
              placeholder="Александр"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-cream/50 mb-2">
              Телефон
            </label>
            <input
              type="tel"
              value={contact}
              onChange={(e) =>
                setContact((prev) => applyRuPhoneInputChange(prev, e.target.value))
              }
              required
              className="w-full rounded-xl border border-cream/15 bg-ink/70 px-4 py-3 text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition"
              placeholder="+7 (999) 123-45-67"
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 text-xs text-cream/70">
            <input
              type="checkbox"
              checked={acceptClubOffer}
              onChange={(e) => setAcceptClubOffer(e.target.checked)}
              className="mt-0.5 accent-gold"
            />
            <span>
              Согласен с{" "}
              {offers?.clubOffer ? (
                <>
                  <button
                    type="button"
                    className="text-gold underline underline-offset-2 hover:opacity-90"
                    onClick={(e) => {
                      e.preventDefault();
                      setReadOffer("club");
                    }}
                  >
                    офертой клуба
                  </button>
                  {` (версия ${offers.clubOffer.version})`}
                </>
              ) : (
                "офертой клуба"
              )}
              .
            </span>
          </label>
          <p className="text-xs text-cream/50">
            Оферта сервиса записи подтверждается при входе в приложение записи.
          </p>
          {error && (
            <p className="text-sm text-burgundy" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || sessions.length === 0}
            className="w-full rounded-full bg-gold px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:scale-[1.02] transition disabled:opacity-60"
          >
            {submitting ? "Переход…" : "Продолжить к записи и оплате"}
          </button>
          <p className="text-xs text-center text-cream/50">
            Дальше — подтверждение телефона и выбор: место за доплату или автоматическая посадка.
          </p>
        </form>
      </div>

      {readOffer === "club" && offers?.clubOffer && (
        <OfferTextModal
          open
          title={`Оферта клуба${offers.club.name ? ` «${offers.club.name}»` : ""}`}
          text={offers.clubOffer.text}
          version={offers.clubOffer.version}
          onClose={() => setReadOffer(null)}
          standaloneHref="/oferta"
        />
      )}
    </div>
  );
}
