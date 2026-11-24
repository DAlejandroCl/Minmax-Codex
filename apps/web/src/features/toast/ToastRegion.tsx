import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toastDuration, useToasts } from "./store";
import type { Toast } from "./store";

const TONE = {
  success: "border-l-diff-green",
  error: "border-l-danger",
  info: "border-l-gold",
} as const;

function ToastItem({ toast }: { readonly toast: Toast }) {
  const { t } = useTranslation();
  const dismiss = useToasts((s) => s.dismiss);
  const [paused, setPaused] = useState(false);

  // El temporizador se detiene mientras el puntero o el foco están dentro (WCAG 2.2.1).
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => dismiss(toast.id), toastDuration(toast.kind));
    return () => window.clearTimeout(timer);
  }, [paused, toast.id, toast.kind, dismiss]);

  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className={`panel flex items-start gap-3 border-l-4 p-3 shadow-lg ${TONE[toast.kind]}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <p className="min-w-0 flex-1 text-sm">{toast.message}</p>
      <button type="button" className="btn px-2 py-0.5 text-sm" onClick={() => dismiss(toast.id)}>
        <span aria-hidden="true">×</span>
        <span className="sr-only">{t("toast.dismiss")}</span>
      </button>
    </div>
  );
}

export function ToastRegion() {
  const { t } = useTranslation();
  const toasts = useToasts((s) => s.toasts);
  const clear = useToasts((s) => s.clear);

  // Escape cierra las notificaciones sin tener que llegar a su botón.
  useEffect(() => {
    if (toasts.length === 0) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") clear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toasts.length, clear]);

  return (
    <section
      aria-label={t("toast.region")}
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-stretch gap-2 sm:left-auto sm:w-96"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </section>
  );
}
