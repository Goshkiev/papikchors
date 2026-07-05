import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import logoUrl from "@/assets/papik-chors-logo.png";
import { ReservationModal } from "@/components/ReservationModal";
import {
  fetchClubNextSession,
  formatSessionWhen,
  formatTournamentBookingSummary,
} from "@/lib/bookingApi";

const CLUB_SLUG = import.meta.env.VITE_CLUB_SLUG ?? "papikchors";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { property: "og:image", content: `https://papikchors.ru${logoUrl}` },
      { name: "twitter:image", content: `https://papikchors.ru${logoUrl}` },
    ],
  }),
});

function useAmbient() {
  const [muted, setMuted] = useState(true);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ gain: GainNode; src: AudioBufferSourceNode } | null>(null);

  useEffect(() => {
    if (muted) {
      if (nodesRef.current) {
        try {
          nodesRef.current.src.stop();
        } catch {}
        nodesRef.current = null;
      }
      return;
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = ctxRef.current ?? new AC();
    ctxRef.current = ctx;
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0.06;
    src.connect(gain).connect(ctx.destination);
    src.start(0);
    nodesRef.current = { gain, src };
    return () => {
      try {
        src.stop();
      } catch {}
    };
  }, [muted]);

  return { muted, toggle: () => setMuted((m) => !m) };
}

function Index() {
  const { muted, toggle } = useAmbient();
  const [reservationOpen, setReservationOpen] = useState(false);
  const [live, setLive] = useState<Awaited<ReturnType<typeof fetchClubNextSession>> | null>(null);
  const [liveErr, setLiveErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchClubNextSession(CLUB_SLUG)
      .then((r) => {
        if (!cancelled) {
          setLive(r);
          setLiveErr(null);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setLiveErr(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const nextGameLabel =
    live?.session != null ? formatSessionWhen(live.session.startsAt) : "Скоро объявим дату";

  const tournamentSummary = live?.session
    ? formatTournamentBookingSummary({
        startsAt: live.session.startsAt,
        registrationClosesAt:
          live.booking?.registrationClosesAt ?? live.session.registrationClosesAt ?? null,
        inProgress: live.booking?.inProgress ?? false,
      })
    : liveErr
      ? "Не удалось загрузить расписание. Попробуйте обновить страницу."
      : null;

  const bookingBaseUrl =
    import.meta.env.VITE_BOOKING_APP_URL ?? live?.bookingBaseUrl ?? "http://localhost:5173";

  function openBooking() {
    setReservationOpen(true);
  }

  return (
    <div className="min-h-screen bg-felt-texture text-cream overflow-x-hidden">
      <Nav muted={muted} onToggleSound={toggle} onBook={openBooking} />
      <Hero onBook={openBooking} tournamentSummary={tournamentSummary} />
      <Legend />
      <HouseRules />
      <Locations />
      <Hands />
      <JoinTable
        onBook={openBooking}
        nextGameLabel={nextGameLabel}
        tournamentSummary={tournamentSummary}
        bookingClosed={live != null && live.session == null}
        seatsLabel={
          live?.seats && live.seats.total > 0
            ? `${live.seats.free} из ${live.seats.total} мест`
            : null
        }
      />
      <Footer />
      <ReservationModal
        open={reservationOpen}
        onClose={() => setReservationOpen(false)}
        nextGameDate={nextGameLabel}
        sessionId={live?.session?.id ?? null}
        bookingBaseUrl={bookingBaseUrl}
        firstVisitFree={live?.pricing.firstVisitFree ?? true}
        clubSlug={CLUB_SLUG}
      />
    </div>
  );
}

function Nav({
  muted,
  onToggleSound,
  onBook,
}: {
  muted: boolean;
  onToggleSound: () => void;
  onBook: () => void;
}) {
  return (
    <nav className="relative z-30 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:py-7">
      <a href="#top" className="flex items-center gap-3">
        <img
          src={logoUrl}
          alt="Papik Chors"
          className="h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12"
          width={48}
          height={48}
        />
        <span className="font-display text-lg tracking-wide text-cream">Papik Chors</span>
      </a>
      <div className="hidden items-center gap-8 text-sm text-cream/70 md:flex">
        <a href="#legend" className="hover:text-gold transition-colors">
          Легенда
        </a>
        <a href="#rules" className="hover:text-gold transition-colors">
          Правила дома
        </a>
        <a href="#tables" className="hover:text-gold transition-colors">
          Столы
        </a>
        <a href="#hands" className="hover:text-gold transition-colors">
          Легендарные раздачи
        </a>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSound}
          aria-label={muted ? "Включить фоновый гул клуба" : "Выключить фоновый гул клуба"}
          className="grid h-9 w-9 place-items-center rounded-full border border-cream/15 text-cream/70 transition-colors hover:border-gold hover:text-gold"
          title={muted ? "Включить уютный гул карточной комнаты" : "Тишина, пожалуйста"}
        >
          {muted ? <IconMute /> : <IconSound />}
        </button>
        <button
          type="button"
          onClick={onBook}
          className="hidden rounded-full bg-gold px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-gold/20 transition-transform hover:scale-105 sm:inline-block"
        >
          Сдай мне карты
        </button>
      </div>
    </nav>
  );
}

function Hero({
  onBook,
  tournamentSummary,
}: {
  onBook: () => void;
  tournamentSummary: string | null;
}) {
  return (
    <header id="top" className="relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-24 h-96 w-96 rounded-full bg-burgundy/40 blur-3xl" />
        <div className="absolute -right-32 top-64 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 pb-12 pt-10 md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:pb-20 md:pt-16">
        <div className="relative order-2 md:order-none">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gold-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            основан где-то между Сочи и Ереваном
          </div>

          <h1 className="mt-6 font-display text-[clamp(3rem,8vw,6.5rem)] leading-[0.95] text-cream">
            Самый <span className="italic text-gold-gradient">душевный</span>,<br />
            наименее серьёзный<br />
            <span className="relative inline-block">
              покерный клуб
              <svg
                className="absolute -bottom-3 left-0 w-full"
                viewBox="0 0 300 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2 8 C 80 -2, 220 -2, 298 8"
                  stroke="var(--color-gold)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>{" "}
            в мире.
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-cream/75">
            Мы называем каждый рейз «баджан». Мы сбрасываем с достоинством — и то не всегда.
            Мы искренне верим, что Король-4 разномастные — это черта характера. Добро пожаловать в{" "}
            <b className="text-cream">Papik Chors Poker Club</b> — где кофе армянский, чай крепкий,
            а блефы совершенно бесстыжие.
          </p>

          {tournamentSummary && (
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-cream/70">{tournamentSummary}</p>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onBook}
              className="group relative overflow-hidden rounded-full bg-gold px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-xl shadow-gold/25 transition-transform hover:scale-105"
            >
              <span className="relative z-10">Забронировать место</span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>
            <a
              href="#rules"
              className="rounded-full border border-cream/20 px-6 py-3.5 text-base text-cream transition-colors hover:border-gold hover:text-gold"
            >
              Прочитать правила дома
            </a>
          </div>

          <div className="mt-12 flex items-center gap-8 text-sm text-cream/60">
            <Stat n="1 247" l="олл-инов пережито" />
            <span className="h-8 w-px bg-cream/15" />
            <Stat n="83" l="баджанов придумано" />
            <span className="h-8 w-px bg-cream/15" />
            <Stat n="∞" l="чашек кофе" />
          </div>
        </div>

        <div className="relative order-1 mx-auto w-full max-w-[560px] px-1 pb-4 md:order-none md:px-0 md:pb-0">
          <div className="pointer-events-none absolute -inset-8 rounded-full bg-gold/10 blur-3xl" />
          <div className="animate-float-slow relative pb-2">
            <img
              src={logoUrl}
              alt="Papik Chors Poker Club — усатый король с Королём Пик и Четвёркой Червей"
              className="relative z-10 block h-auto w-full max-w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
              width={1080}
              height={1080}
            />
          </div>
          <div className="mt-2 font-hand text-xl text-gold sm:text-2xl md:absolute md:-left-2 md:top-10 md:mt-0 md:rotate-[-14deg] md:text-3xl">
            «опять он с этим...»
          </div>
          <div className="mt-1 text-right font-hand text-xl text-cream sm:text-2xl md:absolute md:-right-2 md:bottom-16 md:mt-0 md:rotate-[10deg] md:text-3xl">
            олл-ин, детка ♥
          </div>
        </div>
      </div>

      <MarqueeStrip />
    </header>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="font-display text-2xl text-gold">{n}</div>
      <div className="mt-0.5 text-xs uppercase tracking-widest">{l}</div>
    </div>
  );
}

function MarqueeStrip() {
  const items = [
    "♠ Король-4 навсегда",
    "♥ Удачи, баджан!",
    "♣ Сначала кофе, потом фишки",
    "♦ Олл-ин, детка",
    "♠ Доверяй усам",
    "♥ Никогда не сбрасывай мастевую четвёрку",
    "♣ Ереван передаёт привет",
    "♦ Сочи помнит",
  ];

  return (
    <div className="relative border-y border-cream/10 bg-ink/60 py-4">
      <div className="flex animate-[marquee_35s_linear_infinite] gap-12 whitespace-nowrap font-display text-xl text-gold-soft">
        {[...items, ...items, ...items].map((t, i) => (
          <span key={i} className="opacity-80">
            {t}
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-33.333%) } }`}</style>
    </div>
  );
}

function Legend() {
  return (
    <section id="legend" className="relative mx-auto max-w-7xl px-6 py-24">
      <div className="grid gap-14 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div className="relative">
          <div className="aspect-[4/5] w-full rounded-3xl border border-gold/20 bg-gradient-to-br from-felt to-felt-deep p-1 shadow-2xl shadow-black/50">
            <div className="grid h-full w-full place-items-center rounded-[calc(1.5rem-4px)] bg-[radial-gradient(ellipse_at_center,oklch(0.30_0.06_152)_0%,oklch(0.20_0.04_150)_80%)] p-8">
              <PlayingCard rank="K" suit="♠" tilt="-8deg" />
              <PlayingCard rank="4" suit="♥" tilt="10deg" className="-mt-40 ml-16" />
              <div className="mt-6 text-center font-hand text-3xl text-gold">священная рука</div>
            </div>
          </div>
        </div>

        <div>
          <p className="font-hand text-2xl text-gold">Глава первая</p>
          <h2 className="mt-2 font-display text-5xl leading-tight sm:text-6xl">
            Клуб, созданный <span className="italic text-gold-gradient">одним дядей</span>, одними
            усами и по-настоящему непростительной рукой.
          </h2>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-cream/75">
            <p>
              Всё началось, как и большинство легенд, в 2:14 ночи. Папик — всеобщий любимый дядя —
              получил <b className="text-cream">Короля Пик</b> и{" "}
              <b className="text-cream">Четвёрку Червей</b>. Любой разумный человек сбросил бы. Папик
              пошёл олл-ин.
            </p>
            <p>
              Он выиграл. Потом ещё раз. Потом сделал это{" "}
              <i>ещё четырнадцать раз за три года</i> — и родилась философия: играй руку, которую
              любишь, а не ту, которой положено.
            </p>
            <p>
              Сегодня клуб охватывает два города, три языка и одно общее убеждение — что покер, по
              сути, лишь предлог собрать любимых людей и красиво им врать.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlayingCard({
  rank,
  suit,
  tilt = "0deg",
  className = "",
}: {
  rank: string;
  suit: string;
  tilt?: string;
  className?: string;
}) {
  const red = suit === "♥" || suit === "♦";
  return (
    <div
      className={`relative flex h-56 w-40 flex-col justify-between rounded-xl border border-black/20 bg-ivory p-3 text-ink shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)] ${className}`}
      style={{ transform: `rotate(${tilt})` }}
    >
      <div className={`font-display text-3xl leading-none ${red ? "text-burgundy" : "text-ink"}`}>
        {rank}
        <div className="text-2xl leading-none">{suit}</div>
      </div>
      <div className={`text-center font-display text-6xl ${red ? "text-burgundy" : "text-ink"}`}>
        {suit}
      </div>
      <div
        className={`self-end rotate-180 font-display text-3xl leading-none ${red ? "text-burgundy" : "text-ink"}`}
      >
        {rank}
        <div className="text-2xl leading-none">{suit}</div>
      </div>
    </div>
  );
}

function HouseRules() {
  const rules = [
    {
      n: "01",
      t: "Кофе — раньше фишек.",
      d: "Ни одна раздача не играется на пустой джезве. Если закончился кофе — игра ставится на паузу. Это не рекомендация.",
    },
    {
      n: "02",
      t: "Все — «баджан».",
      d: "Независимо от возраста, пола и стека. Это глубокое ласковое обращение. Особенно уместно при рейзе.",
    },
    {
      n: "03",
      t: "К уважению — Король-4.",
      d: "Кто сыграл K-4 и проиграл — покупает следующий раунд. Кто сыграл K-4 и выиграл — становится фольклором.",
    },
    {
      n: "04",
      t: "Блеф — только театральный.",
      d: "Молчаливый блеф — потраченный впустую. Громко вздыхай. Смотри вдаль. Шепчи своим картам.",
    },
    {
      n: "05",
      t: "Телефоны — экраном вниз.",
      d: "Единственный экран за столом — тот, что за глазами Папика, когда он готовится пойти олл-ин.",
    },
    {
      n: "06",
      t: "Бэд-биты превращаются в истории.",
      d: "У тебя ровно 90 секунд на жалобы. Потом это становится байкой, которую мы пересказываем годами.",
    },
  ];
  return (
    <section id="rules" className="relative border-y border-cream/10 bg-ink/60 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-hand text-2xl text-gold">Правила дома</p>
            <h2 className="mt-2 font-display text-5xl leading-tight sm:text-6xl">
              Шесть заповедей,
              <br />
              ни одной необязательной.
            </h2>
          </div>
          <p className="max-w-md text-cream/70">
            Мы однажды написали их на салфетке. Теперь салфетка в рамке над баром. Пожалуйста,
            внимательно прочти перед своей первой раздачей.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rules.map((r) => (
            <article
              key={r.n}
              className="group relative overflow-hidden rounded-2xl border border-cream/10 bg-gradient-to-b from-felt/60 to-ink p-7 transition-all hover:border-gold/40 hover:-translate-y-1"
            >
              <div className="font-display text-6xl text-gold/20 transition-colors group-hover:text-gold/40">
                {r.n}
              </div>
              <h3 className="mt-2 font-display text-2xl text-cream">{r.t}</h3>
              <p className="mt-3 text-cream/70">{r.d}</p>
              <div className="absolute right-5 top-5 text-2xl text-cream/10 group-hover:text-gold/40">
                ♠
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Locations() {
  return (
    <section id="tables" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="font-hand text-2xl text-gold">Где мы играем</p>
        <h2 className="mt-2 font-display text-5xl leading-tight sm:text-6xl">
          Два города. Одни усы.
        </h2>
        <p className="mt-5 text-cream/70">
          Папик не летает — усы создают слишком большое сопротивление воздуха. Поэтому клуб курсирует
          между двумя любимыми залами.
        </p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <LocationCard
          city="Ереван"
          tag="По выходным · Священные сессии"
          desc="Тёплая задняя комната у улицы Сарьяна. Коньяк на полке, тонирный хлеб на столе и полосатый кот по кличке Chess, который всё контролирует."
          motif="⛰"
          highlights={[
            "Армянский кофе — бесконечно",
            "Ночные дегустации коньяка",
            "Кот-судья: Chess",
          ]}
        />
        <LocationCard
          city="Сочи"
          tag="Летом · Приморские турниры"
          desc="Тенистая терраса, где пальмы наклоняются, чтобы подсмотреть в твои карты. Морю плевать на твой бэд-бит. Папику — чуть-чуть да."
          motif="🌊"
          highlights={[
            "Хедз-ап на закате",
            "Свежий инжир между раздачами",
            "Настоящий океан, настоящий бриз",
          ]}
        />
      </div>
    </section>
  );
}

function LocationCard({
  city,
  tag,
  desc,
  motif,
  highlights,
}: {
  city: string;
  tag: string;
  desc: string;
  motif: string;
  highlights: string[];
}) {
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-cream/10 bg-gradient-to-br from-felt to-felt-deep p-8 shadow-2xl shadow-black/40 transition-all hover:border-gold/40">
      <div className="pointer-events-none absolute -right-10 -top-10 text-[10rem] opacity-10 transition-opacity group-hover:opacity-20">
        {motif}
      </div>
      <div className="relative">
        <div className="text-xs uppercase tracking-[0.25em] text-gold-soft">{tag}</div>
        <h3 className="mt-2 font-display text-5xl text-cream">{city}</h3>
        <p className="mt-4 max-w-md text-cream/70">{desc}</p>
        <ul className="mt-8 space-y-2 text-sm text-cream/80">
          {highlights.map((h) => (
            <li key={h} className="flex items-center gap-3">
              <span className="text-gold">♠</span> {h}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function Hands() {
  const hands = [
    {
      quote:
        "Он посмотрел на меня. Посмотрел на флоп. Сказал: «баджан, прости меня» — и пошёл олл-ин. У него была четвёрка.",
      who: "Ара Г.",
      role: "в клубе с '19",
    },
    {
      quote:
        "Пришёл проиграть деньги. Остался ради кофе. Теперь я проигрываю деньги И у меня есть друзья.",
      who: "Марина С.",
      role: "самопровозглашённый «вечный шорт-стэк»",
    },
    {
      quote:
        "Единственный клуб, где проиграть бай-ин всё равно ощущается как выигрыш в жизни.",
      who: "Давит К.",
      role: "перевоспитавшийся серьёзный покерист",
    },
  ];
  return (
    <section id="hands" className="relative border-y border-cream/10 bg-ink py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-hand text-2xl text-gold">Легендарные раздачи</p>
          <h2 className="mt-2 font-display text-5xl leading-tight sm:text-6xl">
            Отзывы, если это можно так назвать.
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {hands.map((h, i) => (
            <blockquote
              key={i}
              className="relative rounded-2xl border border-cream/10 bg-gradient-to-b from-felt/40 to-ink p-8"
            >
              <div className="font-display text-6xl leading-none text-gold/40">&ldquo;</div>
              <p className="mt-2 text-lg leading-relaxed text-cream/85">{h.quote}</p>
              <footer className="mt-6 border-t border-cream/10 pt-4">
                <div className="font-display text-lg text-cream">{h.who}</div>
                <div className="text-sm text-cream/60">{h.role}</div>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

function JoinTable({
  onBook,
  nextGameLabel,
  tournamentSummary,
  bookingClosed,
  seatsLabel,
}: {
  onBook: () => void;
  nextGameLabel: string;
  tournamentSummary: string | null;
  bookingClosed: boolean;
  seatsLabel: string | null;
}) {
  return (
    <section id="join" className="relative overflow-hidden py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-gold-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          {bookingClosed ? "Запись закрыта" : "Идёт раздача"}
        </div>
        <h2 className="mt-6 font-display text-5xl leading-tight sm:text-7xl">
          Подтяни стул.
          <br />
          <span className="italic text-gold-gradient">Папик оставил тебе место.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-cream/75">
          {tournamentSummary ??
            (bookingClosed
              ? "Ближайший турнир пока не открыт для записи. Загляни позже — или спроси Папика лично."
              : `Ближайший турнир: ${nextGameLabel}.`)}
        </p>
        {seatsLabel && !bookingClosed && (
          <p className="mt-3 text-sm text-gold-soft">Свободно {seatsLabel}</p>
        )}

        <button
          type="button"
          onClick={onBook}
          disabled={bookingClosed}
          className="mx-auto mt-10 rounded-full bg-gold px-8 py-4 text-base font-semibold text-primary-foreground shadow-xl shadow-gold/25 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Сдай мне карты
        </button>

        <p className="mt-4 text-xs uppercase tracking-widest text-cream/40">
          Имя, телефон и оферта — в следующем шаге. Потом выбор места и оплата.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-cream/10 bg-ink py-14">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="Papik Chors"
              className="h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12"
              width={48}
              height={48}
            />
            <span className="font-display text-xl text-cream">Papik Chors Poker Club</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-cream/60">
            Покерный клуб для тех, кто любит игру больше, чем победу в ней. Ереван · Сочи · твой
            кухонный стол, если позовёшь.
          </p>
          <p className="mt-6 font-hand text-2xl text-gold">Король-4 навсегда ♥</p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-cream/50">Клуб</div>
          <ul className="mt-4 space-y-2 text-cream/80">
            <li>
              <a href="#legend" className="hover:text-gold">
                Легенда
              </a>
            </li>
            <li>
              <a href="#rules" className="hover:text-gold">
                Правила дома
              </a>
            </li>
            <li>
              <a href="#tables" className="hover:text-gold">
                Столы
              </a>
            </li>
            <li>
              <a href="#hands" className="hover:text-gold">
                Раздачи
              </a>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-cream/50">Шепни нам</div>
          <ul className="mt-4 space-y-2 text-cream/80">
            <li>hello@papikchors.club</li>
            <li>ул. Сарьяна, Ереван</li>
            <li>Курортный проспект, Сочи</li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-cream/10 px-6 pt-6 text-xs text-cream/40">
        © {new Date().getFullYear()} Papik Chors Poker Club. Играй с друзьями — ответственно.
      </div>
    </footer>
  );
}

function IconMute() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}

function IconSound() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}
