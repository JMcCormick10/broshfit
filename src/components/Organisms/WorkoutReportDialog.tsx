import { useState } from "react";
import { Button } from "../Atoms/Button";
import { Spinner } from "../Atoms/Spinner";
import { CharacterChat } from "../Molecules/CharacterChat";
import { DialogShell } from "../Molecules/DialogShell";
import { useAsyncData } from "../../hooks/useAsyncData";
import { getWorkoutReportMessage } from "../../constants/profile-copy";
import {
  assessWorkoutReportExercise,
  getWorkoutReportCategory,
  type WorkoutReportExerciseAssessment,
  type WorkoutReportExerciseStatus,
} from "../../lib/workout-report";
import {
  type ExerciseHistoryMode,
  getExerciseProgress,
  getCompletedRoutineSessionIds,
  getWorkoutSession,
  type CompletedWorkoutSummary,
  type ExerciseProgressEntry,
  type WorkoutSession,
  type WorkoutSessionExercise,
} from "../../lib/workouts";
import type { ProfileCharacter } from "../../lib/database.types";

type WorkoutReportDialogProps = {
  onClose: () => void;
  onEditWorkout: () => void;
  onViewLongTermTrends: (
    exerciseId: string,
    workout: CompletedWorkoutSummary,
  ) => void;
  profileCharacter: ProfileCharacter | null;
  workout: CompletedWorkoutSummary;
};

type WorkoutReportData = {
  session: WorkoutSession | null;
  progressEntries: ExerciseProgressEntry[];
  hasCompletedRoutine: boolean;
};

function getAssessmentStatusLabel(status: WorkoutReportExerciseStatus): string {
  switch (status) {
    case "up":
      return "Trending up";
    case "declining":
      return "Declining";
    case "not-scored":
      return "Not scored";
    default:
      return "Steady";
  }
}

function getAssessmentStatusClass(status: WorkoutReportExerciseStatus): string {
  switch (status) {
    case "up":
      return "text-success";
    case "declining":
      return "text-danger";
    default:
      return "text-muted-steel";
  }
}

function getExerciseAssessment(
  exercise: WorkoutSessionExercise,
  session: WorkoutSession,
  workoutCompletedAt: string,
  progressEntries: ExerciseProgressEntry[],
  historyMode: ExerciseHistoryMode,
): WorkoutReportExerciseAssessment {
  const history = progressEntries.filter(
    (entry) => entry.exerciseId === exercise.exerciseId,
  );
  const currentCompletionTime = new Date(workoutCompletedAt).getTime();
  const priorHistory = history.filter(
    (entry) =>
      entry.sessionId !== session.id &&
      new Date(entry.completedAt).getTime() < currentCompletionTime,
  );
  const previous =
    historyMode === "routine" && session.routineId !== null
      ? (priorHistory.find(
          (entry) => entry.routineId === session.routineId,
        ) ??
        priorHistory[0] ??
        null)
      : (priorHistory[0] ?? null);

  return assessWorkoutReportExercise(exercise, previous, history);
}

export function WorkoutReportDialog({
  onClose,
  onEditWorkout,
  onViewLongTermTrends,
  profileCharacter,
  workout,
}: WorkoutReportDialogProps) {
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(
    null,
  );
  const [historyMode, setHistoryMode] =
    useState<ExerciseHistoryMode>("routine");
  const {
    data: report,
    error,
    isLoading,
  } = useAsyncData<WorkoutReportData | null>(
    async () => {
      if (!workout.sessionId) {
        return {
          session: null,
          progressEntries: [],
          hasCompletedRoutine: false,
        };
      }

      const session = await getWorkoutSession(workout.sessionId);
      const exerciseIds = [
        ...new Set(
          session.exercises
            .filter((exercise) => exercise.completedAt !== null)
            .map((exercise) => exercise.exerciseId),
        ),
      ];
      const [progressEntries, completedRoutineSessionIds] = await Promise.all([
        exerciseIds.length > 0
          ? getExerciseProgress(exerciseIds)
          : Promise.resolve([] as ExerciseProgressEntry[]),
        session.routineId !== null
          ? getCompletedRoutineSessionIds(
              session.routineId,
              session.id,
              session.startedAt,
            )
          : Promise.resolve([] as string[]),
      ]);

      return {
        session,
        progressEntries,
        hasCompletedRoutine: completedRoutineSessionIds.length > 0,
      };
    },
    [workout.sessionId],
    {
      errorMessage: "Could not load workout report.",
      initialData: null,
    },
  );
  const session = report?.session ?? null;
  const completedExercises = (session?.exercises ?? [])
    .filter((exercise) => exercise.completedAt !== null)
    .sort(
      (first, second) =>
        (first.completedOrder ?? first.routinePosition) -
        (second.completedOrder ?? second.routinePosition),
    );
  const assessedExercises =
    session === null
      ? []
      : completedExercises.map((exercise) => ({
          exercise,
          assessment: getExerciseAssessment(
            exercise,
            session,
            workout.completedAt,
            report?.progressEntries ?? [],
            historyMode,
          ),
        }));
  const category = getWorkoutReportCategory(
    assessedExercises.map(({ assessment }) => assessment),
  );
  const characterMessage = report
    ? getWorkoutReportMessage(profileCharacter, category, workout.id)
    : "Great work finishing your workout. Your progress recap is loading.";

  return (
    <DialogShell
      closeLabel="Close workout report"
      description="Review the exercises completed in this workout."
      eyebrow="Training log // completed session"
      onClose={onClose}
      title="Workout Report"
      titleId="workout-report-heading"
      widthClass="max-w-2xl"
      className="max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <div className="mb-5 flex justify-end">
        <Button onClick={onEditWorkout} variant="outline-secondary">
          Edit workout
        </Button>
      </div>

      <CharacterChat
        label="Workout recap"
        message={characterMessage}
        profileCharacter={profileCharacter}
      />

      {session !== null &&
        session.routineId !== null &&
        report?.hasCompletedRoutine && (
          <div className="mt-5">
            <label className="block space-y-1.5 text-sm font-medium">
              <span>Exercise context</span>
              <select
                aria-label="Exercise context"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-starlight outline-none focus:border-secondary"
                onChange={(event) => {
                  const mode = event.currentTarget.value;
                  if (mode === "routine" || mode === "any") {
                    setHistoryMode(mode);
                  }
                }}
                value={historyMode}
              >
                <option value="routine">Within This Routine</option>
                <option value="any">Any Routine</option>
              </select>
            </label>
            <p className="mt-1.5 text-[10px] text-muted-steel">
              {historyMode === "routine"
                ? "If an exercise has no previous record in this routine, its latest session from any routine or freestyle workout is used."
                : "Comparisons use the latest completed session from any routine or freestyle workout."}
            </p>
          </div>
        )}

      <section
        aria-labelledby="workout-report-exercises-heading"
        className="mt-7"
      >
        <h2
          className="mb-3 font-mono text-[10px] tracking-[0.16em] text-secondary uppercase"
          id="workout-report-exercises-heading"
        >
          Completed exercises
        </h2>
        {isLoading ? (
          <div className="flex min-h-24 items-center justify-center">
            <Spinner label="Loading workout report..." />
          </div>
        ) : error ? (
          <p
            className="rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm"
            role="alert"
          >
            Could not load workout report: {error}
          </p>
        ) : session === null ? (
          <p className="border-y border-border py-5 text-sm text-muted-steel">
            Exercise details are not available for this workout.
          </p>
        ) : completedExercises.length === 0 ? (
          <p className="border-y border-border py-5 text-sm text-muted-steel">
            No exercises were marked complete in this workout.
          </p>
        ) : (
          <ol className="divide-y divide-border border-y border-border">
            {assessedExercises.map(({ exercise, assessment }, index) => {
              const isExpanded = expandedExerciseId === exercise.id;
              const explanationId = `workout-report-explanation-${exercise.id}`;

              return (
                <li className="py-3" key={exercise.id}>
                  <button
                    aria-controls={explanationId}
                    aria-expanded={isExpanded}
                    className="flex w-full items-center gap-3 text-left"
                    onClick={() =>
                      setExpandedExerciseId(isExpanded ? null : exercise.id)
                    }
                    type="button"
                  >
                    <span className="font-mono text-xs text-muted-steel">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        {exercise.exerciseName}
                      </span>
                      <span
                        className={`mt-1 block font-mono text-[10px] tracking-[0.12em] uppercase ${getAssessmentStatusClass(assessment.status)}`}
                      >
                        {getAssessmentStatusLabel(assessment.status)}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-mono text-sm text-muted-steel"
                    >
                      {isExpanded ? "−" : "+"}
                    </span>
                  </button>
                  {isExpanded && (
                    <div
                      className="ml-8 mt-3 space-y-3 rounded-md border border-border bg-surface/50 p-3"
                      id={explanationId}
                    >
                      <ul className="space-y-2 text-sm text-muted-steel">
                        {assessment.explanations.map((explanation) => (
                          <li key={explanation}>{explanation}</li>
                        ))}
                      </ul>
                      <Button
                        onClick={() =>
                          onViewLongTermTrends(exercise.exerciseId, workout)
                        }
                        type="button"
                        variant="outline-small"
                      >
                        Long-term trends
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </DialogShell>
  );
}
