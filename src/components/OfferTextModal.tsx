type Props = {
  open: boolean;
  title: string;
  text: string;
  version?: number;
  onClose: () => void;
  standaloneHref?: string;
};

export function OfferTextModal({
  open,
  title,
  text,
  version,
  onClose,
  standaloneHref,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-modal-title"
    >
      <div className="absolute inset-0 bg-black/85" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex max-h-[85dvh] w-full max-w-lg flex-col rounded-2xl border border-gold/30 bg-ink shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-cream/10 px-5 py-4">
          <div>
            <h4 id="offer-modal-title" className="font-display text-lg text-cream">
              {title}
            </h4>
            {version != null && (
              <p className="mt-0.5 text-xs text-cream/50">Версия {version}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-cream/60 hover:text-gold"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream/85">{text}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-cream/10 px-5 py-3">
          {standaloneHref && (
            <a
              href={standaloneHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gold underline underline-offset-2 hover:opacity-90"
            >
              Открыть на отдельной странице
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gold/40 px-4 py-2 text-sm font-medium text-gold hover:bg-gold/10"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
