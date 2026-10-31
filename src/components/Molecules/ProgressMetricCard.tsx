type ProgressMetricCardProps = {
  label: string;
  tone?: "primary" | "success" | "danger";
  value: string;
};

const valueToneClasses = {
  primary: "text-primary",
  success: "text-success",
  danger: "text-danger",
};

export function ProgressMetricCard({
  label,
  tone = "primary",
  value,
}: ProgressMetricCardProps) {
  return (
    <div className="rounded-md border border-border bg-void/70 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-steel">
        {label}
      </p>
      <p className={`mt-1 font-mono text-xl font-bold ${valueToneClasses[tone]}`}>
        {value}
      </p>
    </div>
  );
}
