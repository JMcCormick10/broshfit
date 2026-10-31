import type { ExerciseProgressEntry } from "../../lib/workouts";
import { getBestEstimatedOneRepMax } from "../../hooks/useExerciseProgressInsights";

export function ProgressSessionRow({ entry }: { entry: ExerciseProgressEntry }) {
  const validSets = entry.sets.filter((set) => set.actualReps !== null);
  const best = getBestEstimatedOneRepMax([entry]);
  const detail = validSets
    .map(
      (set) =>
        `${set.actualReps} reps${set.actualWeight !== null ? ` @ ${set.actualWeight} lb` : ""}`,
    )
    .join(" · ");

  return (
    <article className="flex items-start justify-between gap-3 border-t border-border/70 pt-3 first:border-0 first:pt-0">
      <div>
        <time
          className="text-xs font-semibold text-starlight"
          dateTime={entry.completedAt}
        >
          {new Date(entry.completedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </time>
        <p className="mt-1 text-xs text-muted-steel">
          {detail || "No reps recorded"}
        </p>
      </div>
      <span className="shrink-0 text-right">
        <span className="block font-mono text-sm text-secondary">
          {validSets.length} sets
        </span>
        <span className="text-[10px] text-muted-steel">
          {best === null ? "No estimate" : `e1RM ${Math.round(best)} lb`}
        </span>
      </span>
    </article>
  );
}
