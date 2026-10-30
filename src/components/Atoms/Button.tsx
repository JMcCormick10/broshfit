import type { ButtonHTMLAttributes } from "react";

type ButtonVariant =
  | "primary"
  | "primary-flex"
  | "secondary"
  | "outline"
  | "outline-secondary"
  | "outline-small"
  | "outline-danger-small"
  | "danger"
  | "menu-item"
  | "menu-item-muted"
  | "menu-toggle"
  | "dashboard-primary"
  | "dashboard-secondary"
  | "dashboard-routine"
  | "icon"
  | "icon-danger"
  | "close"
  | "drag-handle"
  | "inline-danger"
  | "small-action"
  | "tab"
  | "profile"
  | "session-exercise";

type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> & {
  selected?: boolean;
  variant: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-void transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50",
  "primary-flex":
    "inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-void transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60",
  secondary:
    "inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2.5 text-sm font-bold text-void transition hover:brightness-110",
  outline:
    "inline-flex items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-muted-steel transition hover:text-starlight disabled:opacity-50",
  "outline-secondary":
    "inline-flex items-center justify-center rounded-md border border-secondary/50 px-3 py-2 text-sm font-semibold text-secondary transition hover:border-secondary hover:bg-void disabled:opacity-50",
  "outline-small":
    "inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted-steel transition hover:border-secondary/60 hover:text-starlight disabled:opacity-50",
  "outline-danger-small":
    "inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted-steel transition hover:border-danger/50 hover:text-danger disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center rounded-md bg-danger px-4 py-2.5 text-sm font-bold text-void transition hover:brightness-110 disabled:opacity-50",
  "menu-item":
    "flex w-full justify-start rounded px-3 py-2.5 text-left text-sm font-normal transition hover:bg-void hover:text-secondary",
  "menu-item-muted":
    "flex w-full justify-start rounded px-3 py-2.5 text-left text-sm font-normal text-muted-steel transition hover:bg-void hover:text-starlight disabled:opacity-50",
  "menu-toggle":
    "flex size-10 flex-col items-center justify-center gap-1.5 rounded-md border border-border transition hover:border-secondary/60",
  "dashboard-primary":
    "flex w-full min-h-16 items-center justify-between gap-4 rounded-md bg-primary px-5 py-4 text-left font-heading text-xl font-bold text-void transition hover:brightness-110",
  "dashboard-secondary":
    "flex w-full min-h-16 items-center justify-between gap-4 rounded-md border border-secondary/50 bg-surface/70 px-5 py-4 text-left font-heading text-xl font-bold text-starlight transition hover:border-secondary hover:bg-surface",
  "dashboard-routine":
    "flex w-full min-h-16 items-center justify-between gap-4 rounded-md border border-accent/50 bg-surface/70 px-5 py-4 text-left font-heading text-xl font-bold text-starlight transition hover:border-accent hover:bg-surface",
  icon: "inline-flex size-8 items-center justify-center rounded border border-border text-muted-steel transition hover:text-starlight disabled:opacity-30",
  "icon-danger":
    "inline-flex size-8 items-center justify-center rounded border border-border text-muted-steel transition hover:border-danger/50 hover:text-danger",
  close:
    "inline-flex items-center justify-center rounded-md px-2 py-1 text-xl text-muted-steel transition hover:text-starlight disabled:opacity-50",
  "drag-handle":
    "inline-flex cursor-grab items-center justify-center touch-none select-none rounded border border-border px-2 py-1 text-muted-steel transition hover:border-secondary hover:text-secondary active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
  "inline-danger":
    "inline-flex items-center justify-center text-muted-steel hover:text-danger",
  "small-action":
    "inline-flex items-center justify-center rounded border border-border px-2.5 py-1.5 text-xs font-semibold text-secondary transition hover:border-secondary disabled:opacity-40",
  tab: "inline-flex items-center justify-center border-b-2 px-4 py-2.5 text-sm font-semibold transition",
  profile:
    "group flex w-full items-center gap-4 rounded-xl border p-3.5 text-left transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-4",
  "session-exercise":
    "flex w-full items-center justify-start gap-4 rounded-none border-0 border-l-2 px-3 py-3 text-left transition hover:bg-surface/60",
};

function getSelectedClasses(variant: ButtonVariant, selected: boolean) {
  if (variant === "tab") {
    return selected
      ? "border-accent text-starlight"
      : "border-transparent text-muted-steel hover:text-starlight";
  }

  if (variant === "profile") {
    return selected
      ? "border-accent/70 bg-accent/5 shadow-[0_0_24px_color-mix(in_srgb,var(--accent)_12%,transparent)]"
      : "border-border bg-void/60 hover:border-accent/50 hover:bg-void";
  }

  if (variant === "session-exercise") {
    return selected ? "border-l-primary bg-surface/60" : "border-l-transparent";
  }

  return "";
}

export function Button({
  selected = false,
  type = "button",
  variant,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${variantClasses[variant]} ${getSelectedClasses(variant, selected)}`}
      type={type}
    />
  );
}
