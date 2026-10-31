import { getPercentChangeTrend } from "../../hooks/useExerciseProgressInsights";

type ProgressSummary = {
  id: string;
  name: string;
  equipment: string;
  sessions: number;
  strengthPercentChange: number | null;
  volumeLoadPercentChange: number | null;
  heaviestLoadPercentChange: number | null;
  totalRepsChange: number | null;
};

function formatPercent(change: number | null) {
  if (change === null) return "—";
  return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
}

function getChangeClass(change: number | null) {
  const trend = getPercentChangeTrend(change);
  return trend === "up"
    ? "text-success"
    : trend === "down"
      ? "text-danger"
      : "text-muted-steel";
}

export function ProgressSummaryCard({
  label,
  item,
  empty,
  onSelect,
}: {
  label: string;
  item: ProgressSummary | null;
  empty: string;
  onSelect: (id: string) => void;
}) {
  const className =
    "w-full rounded-md border border-border bg-surface/70 p-4 text-left transition";
  const content = (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-steel">
        {label}
      </p>
      {item ? (
        <>
          <p className="mt-1 font-heading text-2xl font-bold text-starlight">
            {item.name}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <p className={getChangeClass(item.strengthPercentChange)}>
              e1RM {formatPercent(item.strengthPercentChange)}
            </p>
            <p className={getChangeClass(item.volumeLoadPercentChange)}>
              Volume {formatPercent(item.volumeLoadPercentChange)}
            </p>
            <p className={getChangeClass(item.heaviestLoadPercentChange)}>
              Load {formatPercent(item.heaviestLoadPercentChange)}
            </p>
            <p
              className={
                item.totalRepsChange === null || item.totalRepsChange === 0
                  ? "text-muted-steel"
                  : item.totalRepsChange > 0
                    ? "text-success"
                    : "text-danger"
              }
            >
              Reps{" "}
              {item.totalRepsChange === null
                ? "—"
                : `${item.totalRepsChange > 0 ? "+" : ""}${item.totalRepsChange}`}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-steel">
            {item.sessions} logged sessions · {item.equipment || "Bodyweight"}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-steel">{empty}</p>
      )}
    </>
  );

  return item ? (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={`${className} cursor-pointer hover:border-secondary/60 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
    >
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}
