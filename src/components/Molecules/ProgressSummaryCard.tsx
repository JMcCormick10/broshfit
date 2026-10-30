type ProgressSummary = {
  id: string;
  name: string;
  equipment: string;
  sessions: number;
  percentChange: number | null;
};

export function ProgressSummaryCard({ label, item, empty, onSelect }: { label: string; item: ProgressSummary | null; empty: string; onSelect: (id: string) => void }) {
  const className = "w-full rounded-md border border-border bg-surface/70 p-4 text-left transition";
  const content = <>
    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-steel">{label}</p>
    {item ? <><p className="mt-1 font-heading text-2xl font-bold text-starlight">{item.name}</p><p className={`mt-1 font-mono text-lg font-bold ${item.percentChange! >= 0 ? "text-success" : "text-danger"}`}>{item.percentChange! > 0 ? "+" : ""}{item.percentChange!.toFixed(1)}%</p><p className="text-xs text-muted-steel">Estimated 1RM change · {item.sessions} logged sessions · {item.equipment || "Bodyweight"}</p></> : <p className="mt-3 text-sm text-muted-steel">{empty}</p>}
  </>;
  return item
    ? <button type="button" onClick={() => onSelect(item.id)} className={`${className} cursor-pointer hover:border-secondary/60 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}>{content}</button>
    : <div className={className}>{content}</div>;
}
