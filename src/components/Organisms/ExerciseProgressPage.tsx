import { Button } from "../Atoms/Button";
import { Spinner } from "../Atoms/Spinner";
import { ProgressTrendChart } from "../Molecules/ProgressTrendChart";
import { useEffect } from "react";
import {
  useExerciseProgress,
  type ProgressRange,
} from "../../hooks/useExerciseProgress";
import { useExerciseProgressInsights } from "../../hooks/useExerciseProgressInsights";
import type { ProfileCopy } from "../../constants/profile-copy";
import { CharacterChat } from "../Molecules/CharacterChat";
import { ProgressChangeBadge } from "../Molecules/ProgressChangeBadge";
import { ProgressSummaryCard } from "../Molecules/ProgressSummaryCard";
import { ProgressMetricCard } from "../Molecules/ProgressMetricCard";
import { ProgressSessionRow } from "../Molecules/ProgressSessionRow";
import { ProgressFeedbackBreakdown } from "../Molecules/ProgressFeedbackBreakdown";

const ranges: { value: ProgressRange; label: string }[] = [
  { value: "month", label: "1 month" },
  { value: "3months", label: "3 months" },
  { value: "6months", label: "6 months" },
  { value: "year", label: "1 year" },
  { value: "all", label: "All time" },
];

type ExerciseProgressPageProps = {
  profileCopy: ProfileCopy;
  profileName: string;
};

export function ExerciseProgressPage({
  profileCopy,
  profileName,
}: ExerciseProgressPageProps) {
  const progress = useExerciseProgress();
  const insights = useExerciseProgressInsights(progress);
  useEffect(() => {
    if (progress.selectedExerciseId)
      window.scrollTo({ top: 0, behavior: "smooth" });
  }, [progress.selectedExerciseId]);
  if (progress.isLoading)
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading exercise progress..." />
      </div>
    );

  if (progress.error)
    return (
      <section className="mx-auto max-w-5xl px-4 py-10">
        <p className="rounded-md border border-danger/50 p-4 text-danger">
          {progress.error}
        </p>
      </section>
    );

  const selected = insights.selected;

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6">
      {selected ? (
        <ExerciseDetail
          selected={selected}
          progress={progress}
          insights={insights}
          profileCopy={profileCopy}
          profileName={profileName}
        />
      ) : (
        <>
          <header>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Training analytics
            </p>
            <h1 className="mt-1 font-heading text-4xl font-bold text-starlight sm:text-5xl">
              View Progress
            </h1>{" "}
          </header>

          <section aria-label="Progress summary" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                className="flex flex-wrap gap-1"
                aria-label="Overview time range"
              >
                {ranges.map((item) => (
                  <Button
                    key={item.value}
                    variant="tab"
                    selected={progress.range === item.value}
                    aria-pressed={progress.range === item.value}
                    onClick={() => progress.setRange(item.value)}
                    type="button"
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
            <CharacterChat
              profileName={profileName}
              message={profileCopy.progressMessage(
                insights.overallTrend,
                insights.overviewVariant,
              )}
            />
            <ProgressFeedbackBreakdown {...insights.exerciseBreakdown} />
            <div className="grid gap-3 sm:grid-cols-2">
              <ProgressSummaryCard
                label="Best progress"
                item={insights.bestProgress}
                empty="Not enough comparable sessions in this range yet."
                onSelect={progress.setSelectedExerciseId}
              />
              <ProgressSummaryCard
                label="Needs attention"
                item={insights.worstProgress}
                empty="Not enough comparable sessions in this range yet."
                onSelect={progress.setSelectedExerciseId}
              />
            </div>
          </section>

          {progress.exercises.length === 0 ? (
            <section className="rounded-lg border border-border bg-surface/70 p-8 text-center">
              <h2 className="font-heading text-2xl font-bold text-starlight">
                Your progress starts with a completed workout
              </h2>
              <p className="mt-2 text-sm text-muted-steel">
                Once you complete an exercise, it will appear here with its
                training history.
              </p>
            </section>
          ) : (
            <div className="grid gap-6">
              <section className="min-w-0">
                <div className="mb-3 flex items-end justify-between gap-2">
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-starlight">
                      Your exercises
                    </h2>
                    <p className="text-xs text-muted-steel">
                      Sorted by times completed · select one to view details
                    </p>
                  </div>
                  <span className="font-mono text-xs text-secondary">
                    {progress.exercises.length} TOTAL
                  </span>
                </div>
                <div className="space-y-2">
                  {progress.exercises.map((exercise, index) => (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() =>
                        progress.setSelectedExerciseId(exercise.id)
                      }
                      className="flex w-full items-center gap-3 rounded-md border border-border bg-surface/60 p-3 text-left transition hover:border-secondary/60"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded bg-void font-mono text-sm text-secondary">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-starlight">
                          {exercise.name}
                        </span>
                        <span className="block truncate text-xs text-muted-steel">
                          {exercise.equipment || "Bodyweight"}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-mono text-sm font-bold text-primary">
                          {exercise.entries.length}
                        </span>
                        <span className="text-[10px] text-muted-steel">
                          sessions
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function ExerciseDetail({
  selected,
  progress,
  insights,
  profileCopy,
  profileName,
}: {
  selected: NonNullable<
    ReturnType<typeof useExerciseProgress>["selectedExercise"]
  >;
  progress: ReturnType<typeof useExerciseProgress>;
  insights: ReturnType<typeof useExerciseProgressInsights>;
  profileCopy: ProfileCopy;
  profileName: string;
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <Button
          variant="outline-small"
          type="button"
          onClick={() => progress.setSelectedExerciseId(null)}
        >
          ← Back to progress
        </Button>
        <header>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-secondary">
            Exercise breakdown
          </p>
          <h1 className="mt-1 font-heading text-4xl font-bold text-starlight sm:text-5xl">
            {selected.name}
          </h1>
          <p className="mt-1 text-sm text-muted-steel">
            {selected.equipment || "Bodyweight"} · {selected.entries.length}{" "}
            completed sessions
          </p>
          <ProgressChangeBadge change={insights.percentChange} />
        </header>
      </div>
      <CharacterChat
        profileName={profileName}
        message={profileCopy.progressMessage(
          insights.trend,
          insights.detailVariant,
        )}
      />
      <div className="rounded-lg border border-border bg-surface/70 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2" aria-label="Progress time range">
          {ranges.map((item) => (
            <Button
              key={item.value}
              variant="tab"
              selected={progress.range === item.value}
              aria-pressed={progress.range === item.value}
              onClick={() => progress.setRange(item.value)}
              type="button"
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ProgressMetricCard
            label="Sessions"
            value={String(insights.selectedEntries.length)}
          />
          <ProgressMetricCard
            label="Best estimated 1RM"
            value={
              insights.rangeBest === null
                ? "—"
                : `${Math.round(insights.rangeBest)}`
            }
          />
          <ProgressMetricCard
            label="Progress · selected range"
            value={
              insights.change === null
                ? "—"
                : `${insights.change >= 0 ? "+" : ""}${Math.round(insights.change)}`
            }
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-steel">
          Estimated one rep max uses the Epley formula: weight × (1 + reps ÷
          30). Estimates are shown in the same units as your logged weights.
          Progress compares your earliest and strongest logged estimates.
        </p>
      </div>
      <ProgressTrendChart entries={insights.selectedEntries} />
      <div className="rounded-lg border border-border bg-surface/60 p-4">
        <h2 className="mb-3 font-heading text-xl font-bold text-starlight">
          Recent sessions
        </h2>
        <div className="space-y-3">
          {[...insights.selectedEntries]
            .reverse()
            .slice(0, 6)
            .map((entry) => (
              <ProgressSessionRow key={entry.id} entry={entry} />
            ))}
          {insights.selectedEntries.length === 0 && (
            <p className="text-sm text-muted-steel">
              No sessions in this time range.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
