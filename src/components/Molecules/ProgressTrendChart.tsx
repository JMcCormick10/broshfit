import type { ExerciseProgressEntry } from "../../lib/workouts";
import { estimateOneRepMax } from "../../hooks/useExerciseProgressInsights";

type Props = { entries: ExerciseProgressEntry[] };

export function ProgressTrendChart({ entries }: Props) {
  const points = [...entries].reverse().map((entry) => {
    const estimates = entry.sets.map((set) => estimateOneRepMax(set.actualWeight, set.actualReps)).filter((value): value is number => value !== null);
    return { date: entry.completedAt, max: estimates.length ? Math.max(...estimates) : null };
  }).filter((point): point is { date: string; max: number } => point.max !== null);

  if (points.length === 0) return <p className="rounded-lg border border-border p-5 text-sm text-muted-steel">Log reps and weight to see an estimated one rep max trend.</p>;
  const width = 720;
  const height = 240;
  const pad = { top: 20, right: 22, bottom: 38, left: 48 };
  const min = Math.min(...points.map((point) => point.max));
  const max = Math.max(...points.map((point) => point.max));
  const span = max - min || max * 0.1 || 1;
  const chartPoints = points.map((point, index) => ({
    ...point,
    x: pad.left + (points.length === 1 ? (width - pad.left - pad.right) / 2 : index * (width - pad.left - pad.right) / (points.length - 1)),
    y: pad.top + (max - point.max) * (height - pad.top - pad.bottom) / span,
  }));
  const path = chartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <div className="rounded-lg border border-border bg-void/50 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2"><h3 className="font-heading text-xl font-bold text-starlight">Estimated 1RM</h3><span className="text-xs text-muted-steel">Epley · weight units as logged</span></div>
      <svg role="img" aria-label="Estimated one rep max over completed workouts" viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        {[0, 1, 2, 3].map((step) => { const y = pad.top + step * (height - pad.top - pad.bottom) / 3; const value = max - step * span / 3; return <g key={step}><line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="var(--border)" strokeDasharray="4 5"/><text x={pad.left - 8} y={y + 4} fill="var(--text-muted)" fontSize="11" textAnchor="end">{Math.round(value)}</text></g>; })}
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {chartPoints.map((point) => <circle key={point.date} cx={point.x} cy={point.y} r="5" fill="var(--primary)" stroke="var(--bg)" strokeWidth="2"><title>{new Date(point.date).toLocaleDateString()}: {Math.round(point.max)} estimated</title></circle>)}
        {chartPoints.filter((_, index) => index === 0 || index === chartPoints.length - 1).map((point) => <text key={`date-${point.date}`} x={point.x} y={height - 8} fill="var(--text-muted)" fontSize="11" textAnchor={point.x === pad.left ? "start" : point.x === chartPoints[0].x ? "middle" : "end"}>{new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</text>)}
      </svg>
    </div>
  );
}
