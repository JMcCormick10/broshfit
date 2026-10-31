import { getProfileCopy } from "../../constants/profile-copy";
import { useExerciseProgress } from "../../hooks/useExerciseProgress";
import {
  getBestEstimatedOneRepMax,
  useExerciseProgressInsights,
} from "../../hooks/useExerciseProgressInsights";
import type { ProgressRange } from "../../hooks/useExerciseProgress";
import { Spinner } from "../Atoms/Spinner";
import { CharacterChat } from "./CharacterChat";
import { ProgressChangeBadge } from "./ProgressChangeBadge";

const ranges: { value: ProgressRange; label: string }[] = [
  { value: "month", label: "1 month" },
  { value: "3months", label: "3 months" },
  { value: "6months", label: "6 months" },
  { value: "year", label: "1 year" },
  { value: "all", label: "All time" },
];

export function RecentExerciseTrends({
  exerciseId,
  profileName,
}: {
  exerciseId: string;
  profileName: string;
}) {
  const progress = useExerciseProgress(exerciseId);
  const exercise = progress.exercises.find((item) => item.id === exerciseId);
  const insights = useExerciseProgressInsights({
    exercises: exercise ? [exercise] : [],
    getEntriesInRange: progress.getEntriesInRange,
    range: progress.range,
    selectedExerciseId: exerciseId,
  });
  const estimatedSessionCount = insights.selectedEntries.filter(
    (entry) => getBestEstimatedOneRepMax([entry]) !== null,
  ).length;
  const percentChange =
    estimatedSessionCount >= 2 ? insights.percentChange : null;
  const trend = insights.strengthTrend;
  const profileCopy = getProfileCopy(profileName);

  return (
    <section
      aria-label="Recent exercise trends"
      className="space-y-4 rounded-md border border-border bg-void/50 p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-lg font-bold text-starlight">
          Recent Trends
        </h3>
        <label className="flex items-center gap-2 text-xs text-muted-steel">
          <span>Range</span>
          <select
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-starlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            value={progress.range}
            onChange={(event) => {
              const range = ranges.find(
                (option) => option.value === event.currentTarget.value,
              );
              if (range) progress.setRange(range.value);
            }}
          >
            {ranges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {progress.isLoading ? (
        <Spinner label="Loading recent trends..." />
      ) : progress.error ? (
        <p
          className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {progress.error}
        </p>
      ) : (
        <>
          <CharacterChat
            profileName={profileName}
            message={profileCopy.progressMessage(
              trend,
              insights.detailVariant,
            )}
          />
          <ProgressChangeBadge change={percentChange} />
        </>
      )}
    </section>
  );
}
