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
  getExerciseProgress,
  getWorkoutSession,
  type CompletedWorkoutSummary,
  type ExerciseProgressEntry,
  type WorkoutSession,
  type WorkoutSessionExercise,
} from "../../lib/workouts";

type WorkoutReportDialogProps = {
  onClose: () => void;
  onEditWorkout: () => void;
  onViewLongTermTrends: (
    exerciseId: string,
    workout: CompletedWorkoutSummary,
  ) => void;
  profileName: string;
  workout: CompletedWorkoutSummary;
};

type WorkoutReportData = {
  session: WorkoutSession | null;
  progressEntries: ExerciseProgressEntry[];
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
): WorkoutReportExerciseAssessment {
  const history = progressEntries.filter(
    (entry) =>
      entry.exerciseId === exercise.exerciseId &&
      entry.sourceWorkoutExerciseId !== null,
  );
  const currentCompletionTime = new Date(workoutCompletedAt).getTime();
  const previous =
    history.find(
      (entry) =>
        entry.sessionId !== session.id &&
        new Date(entry.completedAt).getTime() < currentCompletionTime,
    ) ?? null;

  return assessWorkoutReportExercise(exercise, previous, history);
}

export function WorkoutReportDialog({
  onClose,
  onEditWorkout,
  onViewLongTermTrends,
  profileName,
  workout,
}: WorkoutReportDialogProps) {
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(
    null,
  );
  const {
    data: report,
    error,
    isLoading,
  } = useAsyncData<WorkoutReportData | null>(
    async () => {
      if (!workout.sessionId) {
        return { session: null, progressEntries: [] };
      }

      const session = await getWorkoutSession(workout.sessionId);
      const exerciseIds = [
        ...new Set(
          session.exercises
            .filter(
              (exercise) =>
                exercise.completedAt !== null &&
                exercise.sourceWorkoutExerciseId !== null,
            )
            .map((exercise) => exercise.exerciseId),
        ),
      ];
      const progressEntries =
        exerciseIds.length > 0 ? await getExerciseProgress(exerciseIds) : [];

      return { session, progressEntries };
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
          ),
        }));
  const category = getWorkoutReportCategory(
    assessedExercises.map(({ assessment }) => assessment),
  );
  const characterMessage = report
    ? getWorkoutReportMessage(profileName, category, workout.id)
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
        profileName={profileName}
      />

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
