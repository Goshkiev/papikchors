import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchPublicOfferBundle } from "../lib/bookingApi";

const CLUB_SLUG = import.meta.env.VITE_CLUB_SLUG ?? "papikchors";

export const Route = createFileRoute("/oferta")({
  component: OfertaPage,
});

function OfertaPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof fetchPublicOfferBundle>> | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchPublicOfferBundle(CLUB_SLUG)
      .then((r) => {
        if (!cancelled) {
          setBundle(r);
          setErr(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Ошибка загрузки");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const offer = bundle?.clubOffer;
  const title = `Оферта клуба${bundle?.club.name ? ` «${bundle.club.name}»` : ""}`;

  return (
    <div className="min-h-dvh bg-felt-texture text-cream px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="text-sm text-gold underline underline-offset-2 hover:opacity-90">
          ← На главную
        </Link>
        <h1 className="mt-4 font-display text-2xl">{title}</h1>
        <p className="mt-2 text-sm text-cream/70">
          Документ, с которым вы соглашаетесь при записи на игру в клубе.
        </p>
        {loading && <p className="mt-6 text-cream/60">Загрузка…</p>}
        {err && <p className="mt-6 text-burgundy">{err}</p>}
        {!loading && !err && !offer && (
          <p className="mt-6 text-cream/60">Текст оферты пока не опубликован.</p>
        )}
        {offer && (
          <article className="mt-6 rounded-2xl border border-cream/10 bg-ink/70 p-6">
            <p className="mb-4 text-xs text-cream/50">Версия {offer.version}</p>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-cream/85">
              {offer.text}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
