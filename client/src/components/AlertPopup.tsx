import { useEffect } from 'react';

export type AlertType = 'error' | 'warning' | 'info';

interface AlertPopupProps {
  type?: AlertType;
  title: string;
  message: string;
  onClose: () => void;
}

const STYLES: Record<AlertType, { border: string; icon: string; badge: string; btn: string }> = {
  error: {
    border: 'border-rose-500/30',
    icon: 'text-rose-400',
    badge: 'bg-rose-500/10 text-rose-300',
    btn: 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20',
  },
  warning: {
    border: 'border-amber-400/30',
    icon: 'text-amber-400',
    badge: 'bg-amber-400/10 text-amber-300',
    btn: 'bg-amber-400/10 text-amber-300 hover:bg-amber-400/20',
  },
  info: {
    border: 'border-teal-400/30',
    icon: 'text-teal-400',
    badge: 'bg-teal-400/10 text-teal-300',
    btn: 'bg-teal-400/10 text-teal-300 hover:bg-teal-400/20',
  },
};

const ICONS: Record<AlertType, React.ReactNode> = {
  error: (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v4M10 13.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <path d="M9.13 3.5L1.5 16.5h17L10.87 3.5a1 1 0 00-1.74 0z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 8.5v4M10 14.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9v5M10 6v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

export function AlertPopup({ type = 'error', title, message, onClose }: AlertPopupProps) {
  const s = STYLES[type];

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {/* Card */}
      <div
        className={`w-full max-w-sm rounded-2xl border bg-slate-900 shadow-2xl ${s.border}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        aria-describedby="alert-message"
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5">
          <span className={`mt-0.5 flex-shrink-0 ${s.icon}`}>{ICONS[type]}</span>
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${s.badge.split(' ')[1]}`}>
              {type}
            </p>
            <h2 id="alert-title" className="mt-0.5 text-sm font-semibold text-slate-100">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <p id="alert-message" className="px-5 py-3 text-sm leading-relaxed text-slate-400">
          {message}
        </p>

        {/* Footer */}
        <div className="flex justify-end px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${s.btn}`}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
