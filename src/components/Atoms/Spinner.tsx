type SpinnerProps = {
  compact?: boolean;
  label: string;
};

export function Spinner({ compact = false, label }: SpinnerProps) {
  return (
    <div
      aria-label={label}
      className={`spinner${compact ? " spinner--compact" : ""}`}
      role="status"
    >
      <span aria-hidden="true" className="spinner__indicator" />
      <span className="font-mono text-[10px] tracking-[0.12em] text-muted-steel uppercase">
        {label}
      </span>
    </div>
  );
}
