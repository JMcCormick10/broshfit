import { getPercentChangeTrend } from "../../hooks/useExerciseProgressInsights";

export function ProgressChangeBadge({ change }: { change: number | null }) {
  if (change === null) {
    return (
      <div className="mt-3 w-full rounded-md border border-border bg-surface/70 px-4 py-2 text-center text-sm text-muted-steel">
        Not enough data · selected range
      </div>
    );
  }

  const trend = getPercentChangeTrend(change);
  const isUp = trend === "up";
  const isDown = trend === "down";
  const tone = isUp
    ? "border-success/40 bg-success/10 text-success"
    : isDown
      ? "border-danger/40 bg-danger/10 text-danger"
      : "border-border bg-surface/70 text-muted-steel";
  const changeLabel = isUp
    ? "increased"
    : isDown
      ? "decreased"
      : "about the same";

  return (
    <div className={`mt-3 w-full rounded-md border px-4 py-2 text-center ${tone}`}>
      <p className="font-mono text-xl font-bold">
        {change > 0 ? "+" : ""}
        {change.toFixed(1)}%
      </p>
      <p className="text-[10px] uppercase tracking-wide">
        Estimated 1RM {changeLabel} · selected range
      </p>
    </div>
  );
}
