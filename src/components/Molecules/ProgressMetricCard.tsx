export function ProgressMetricCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-border bg-void/70 p-3">
    <p className="text-[10px] uppercase tracking-wide text-muted-steel">{label}</p>
    <p className="mt-1 font-mono text-xl font-bold text-primary">{value}</p>
  </div>;
}
