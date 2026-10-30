import type { ReactNode } from "react";
import { Button } from "../Atoms/Button";

type DialogShellProps = {
  children: ReactNode;
  closeDisabled?: boolean;
  closeLabel: string;
  className?: string;
  description?: string;
  eyebrow: string;
  onClose: () => void;
  title: ReactNode;
  titleId: string;
  widthClass: string;
};

export function DialogShell({
  children,
  closeDisabled = false,
  closeLabel,
  className = "",
  description,
  eyebrow,
  onClose,
  title,
  titleId,
  widthClass,
}: DialogShellProps) {
  function closeIfAllowed() {
    if (!closeDisabled) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeIfAllowed();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") closeIfAllowed();
      }}
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className={`dialog-surface min-w-0 w-full ${widthClass} rounded-xl border border-border bg-surface shadow-2xl shadow-black/60 ${className}`}
        role="dialog"
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase">
              {eyebrow}
            </p>
            <h2 id={titleId} className="mt-2 font-heading text-3xl font-bold">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-muted-steel">{description}</p>
            )}
          </div>
          <Button
            variant="close"
            type="button"
            aria-label={closeLabel}
            disabled={closeDisabled}
            onClick={closeIfAllowed}
          >
            ×
          </Button>
        </header>
        {children}
      </section>
    </div>
  );
}
