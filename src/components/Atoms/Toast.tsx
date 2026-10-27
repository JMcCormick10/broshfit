import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ToastProps = {
  durationMs?: number;
  message: string;
  onDismiss: () => void;
};

export function Toast({ durationMs = 4000, message, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const showFrame = requestAnimationFrame(() => setIsVisible(true));
    const fadeTimer = setTimeout(() => setIsVisible(false), durationMs);
    const dismissTimer = setTimeout(
      () => dismissRef.current(),
      durationMs + 300,
    );

    return () => {
      cancelAnimationFrame(showFrame);
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [durationMs, message]);

  return createPortal(
    <div
      aria-live="polite"
      className={`fixed left-1/2 top-4 z-[70] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-lg border-2 border-secondary/70 border-l-4 bg-surface px-4 py-3 text-sm text-starlight shadow-2xl shadow-black/70 ring-1 ring-secondary/25 transition-all duration-300 sm:w-auto sm:min-w-80 ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      }`}
      role="status"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-full border border-secondary/60 bg-secondary/15 font-bold text-secondary"
        >
          ✓
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-bold tracking-[0.16em] text-secondary uppercase">
            Action complete
          </p>
          <p className="mt-0.5 break-words">{message}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
