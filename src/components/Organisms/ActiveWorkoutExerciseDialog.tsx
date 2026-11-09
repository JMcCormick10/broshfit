import { useAsyncData } from "../../hooks/useAsyncData";
import {
  getBestEstimatedOneRepMaxSet,
  estimateOneRepMax,
} from "../../hooks/useExerciseProgressInsights";
import {
  applySetWeightChange,
  getExerciseProgress,
  inheritFirstSetWeight,
  type ExerciseHistory,
  type ExerciseHistoryMode,
  type ExerciseProgressEntry,
  type WorkoutSessionExercise,
} from "../../lib/workouts";
import {
  getExerciseMuscleTargets,
  type ExerciseMuscleTargets,
} from "../../lib/exercises";
import { getNextEstimatedOneRepMaxTarget } from "../../constants/profile-copy/coach-suggestions";
import { formatExerciseHistorySets } from "../../hooks/useExerciseHistory";
import { Button } from "../Atoms/Button";
import { WeightInput } from "../Atoms/WeightInput";
import { DialogShell } from "../Molecules/DialogShell";
import { ExerciseHistoryActions } from "../Molecules/ExerciseHistoryActions";
import { FormField } from "../Molecules/FormField";
import type { ProfileCharacter } from "../../lib/database.types";

type ActiveWorkoutExerciseDialogProps = {
  exercise: WorkoutSessionExercise;
  exerciseHistoryMode: ExerciseHistoryMode;
  exerciseHistory: ExerciseHistory | null;
  exerciseHistoryError: string | null;
  hasCompletedRoutine: boolean;
  isLoadingHistory: boolean;
  isSaving: boolean;
  onAddSet: (exercise: WorkoutSessionExercise) => void;
  onClose: () => void;
  onCompleteExercise: (exercise: WorkoutSessionExercise) => void;
  onExerciseHistoryModeChange: (mode: ExerciseHistoryMode) => void;
  onSaveProgress: (exercise: WorkoutSessionExercise) => Promise<void>;
  profileCharacter: ProfileCharacter | null;
  saveError: string | null;
  updateExercise: (
    exerciseId: string,
    update: (exercise: WorkoutSessionExercise) => WorkoutSessionExercise,
  ) => void;
};

export function ActiveWorkoutExerciseDialog({
  exercise,
  exerciseHistoryMode,
  exerciseHistory,
  exerciseHistoryError,
  hasCompletedRoutine,
  isLoadingHistory,
  isSaving,
  onAddSet,
  onClose,
  onCompleteExercise,
  onExerciseHistoryModeChange,
  onSaveProgress,
  profileCharacter,
  saveError,
  updateExercise,
}: ActiveWorkoutExerciseDialogProps) {
  const {
    data: exerciseProgress,
    error: exerciseProgressError,
    isLoading: isLoadingExerciseProgress,
  } = useAsyncData(
    () => getExerciseProgress(exercise.exerciseId),
    [exercise.exerciseId],
    {
      errorMessage: "Could not load estimated 1RM history.",
      initialData: [] as ExerciseProgressEntry[],
    },
  );
  const {
    data: muscleTargets,
    error: muscleTargetsError,
    isLoading: isLoadingMuscleTargets,
  } = useAsyncData(
    () => getExerciseMuscleTargets(exercise.exerciseId),
    [exercise.exerciseId],
    {
      errorMessage: "Could not load muscle groups.",
      initialData: {
        primaryMuscleGroups: [],
        secondaryMuscleGroups: [],
      } satisfies ExerciseMuscleTargets,
    },
  );

  const muscleGroups = [
    ...muscleTargets.primaryMuscleGroups,
    ...muscleTargets.secondaryMuscleGroups,
  ];
  const bestEstimatedOneRepMaxSet =
    getBestEstimatedOneRepMaxSet(exerciseProgress);
  const nextEstimatedOneRepMaxTarget =
    bestEstimatedOneRepMaxSet &&
    !isLoadingMuscleTargets &&
    !muscleTargetsError
      ? getNextEstimatedOneRepMaxTarget(
          {
            setNumber: bestEstimatedOneRepMaxSet.setNumber,
            actualReps: bestEstimatedOneRepMaxSet.reps,
            weight: bestEstimatedOneRepMaxSet.weight,
          },
          exercise.sets.map((set) => set.targetReps),
          muscleGroups,
        )
      : null;
  const nextEstimatedOneRepMax =
    nextEstimatedOneRepMaxTarget === null
      ? null
      : estimateOneRepMax(
          nextEstimatedOneRepMaxTarget.weight,
          nextEstimatedOneRepMaxTarget.reps,
        );

  function formatLoad(value: number): string {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(value);
  }

  return (
    <DialogShell
      closeDisabled={isSaving}
      closeLabel="Close exercise"
      eyebrow={exercise.equipment || "Workout exercise"}
      onClose={onClose}
      title={exercise.exerciseName}
      titleId="selected-exercise-heading"
      widthClass="max-w-2xl"
      className="max-h-[90vh] overflow-y-auto p-5 sm:p-7"
    >
      {saveError && (
        <p
          className="mb-4 rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm"
          role="alert"
        >
          {saveError}
        </p>
      )}

      {exercise.completedAt && (
        <p className="mb-4 rounded-md border border-secondary/40 px-3 py-2 font-mono text-[10px] text-secondary uppercase">
          Completed #{exercise.completedOrder}
        </p>
      )}

      {hasCompletedRoutine && (
        <div className="mb-4">
          <FormField label="Exercise context">
            <select
              aria-label="Exercise context"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-starlight outline-none focus:border-secondary"
              onChange={(event) => {
                const mode = event.currentTarget.value;
                if (mode === "routine" || mode === "any") {
                  onExerciseHistoryModeChange(mode);
                }
              }}
              value={exerciseHistoryMode}
            >
              <option value="routine">Within This Routine</option>
              <option value="any">Any Routine</option>
            </select>
          </FormField>
          <p className="mt-1.5 text-[10px] text-muted-steel">
            {exerciseHistoryMode === "routine"
              ? "If this exercise has no completed session in this routine yet, its latest session from any routine is used."
              : "Uses the most recent completed session from any routine."}
          </p>
        </div>
      )}

      {isLoadingHistory ? (
        <p className="mb-4 text-xs text-muted-steel">
          Checking your last session...
        </p>
      ) : exerciseHistoryError ? (
        <p
          className="mb-4 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger"
          role="alert"
        >
          Could not load exercise history: {exerciseHistoryError}
        </p>
      ) : exerciseHistory ? (
        <div className="mb-4 rounded-md border border-border bg-surface px-3 py-2.5">
          <p className="font-mono text-[10px] tracking-[0.12em] text-muted-steel uppercase">
            Last time{" "}
            {exerciseHistory.comparisonScope === "routine"
              ? "in this routine"
              : "in any workout"}{" "}
            //{" "}
            {new Date(exerciseHistory.completedAt).toLocaleDateString()}
          </p>
          <p className="mt-1.5 text-sm text-starlight">
            {formatExerciseHistorySets(exerciseHistory.sets)}
          </p>
          {exerciseHistory.notes && (
            <p className="mt-1 text-xs text-muted-steel">
              &ldquo;{exerciseHistory.notes}&rdquo;
            </p>
          )}
        </div>
      ) : (
        <p className="mb-4 text-xs text-muted-steel">
          No previous completed sets are recorded for this exercise.
        </p>
      )}

      <section
        aria-labelledby="exercise-one-rep-max-heading"
        className="mb-4 rounded-md border border-secondary/40 bg-surface/40 px-3 py-2.5"
      >
        <h3
          id="exercise-one-rep-max-heading"
          className="font-mono text-[10px] tracking-[0.12em] text-muted-steel uppercase"
        >
          All-time estimated 1RM
        </h3>
        {isLoadingExerciseProgress ? (
          <p className="mt-1.5 text-xs text-muted-steel">
            Loading your record...
          </p>
        ) : exerciseProgressError ? (
          <p className="mt-1.5 text-xs text-danger" role="alert">
            Could not load estimated 1RM history: {exerciseProgressError}
          </p>
        ) : bestEstimatedOneRepMaxSet === null ? (
          <p className="mt-1.5 text-xs text-muted-steel">
            No weighted sets with reps are recorded yet.
          </p>
        ) : (
          <>
            <p className="mt-1.5 text-xs text-starlight">
              <span className="font-semibold text-secondary">Best:</span>{" "}
              {formatLoad(bestEstimatedOneRepMaxSet.estimatedOneRepMax)} lb
            </p>
            <p className="mt-1 text-xs text-starlight">
              <span className="font-semibold text-secondary">Set with:</span>{" "}
              {formatLoad(bestEstimatedOneRepMaxSet.weight)} lb ×{" "}
              {bestEstimatedOneRepMaxSet.reps} reps
            </p>
            {isLoadingMuscleTargets ? (
              <p className="mt-1 text-xs text-muted-steel">
                Loading your next target...
              </p>
            ) : muscleTargetsError ? (
              <p className="mt-1 text-xs text-danger">
                Could not calculate a next target because muscle groups failed
                to load.
              </p>
            ) : nextEstimatedOneRepMaxTarget ? (
              <p className="mt-1 text-xs text-starlight">
                <span className="font-semibold text-secondary">
                  To beat it:
                </span>{" "}
                {formatLoad(nextEstimatedOneRepMaxTarget.weight)} lb ×{" "}
                {nextEstimatedOneRepMaxTarget.reps} reps
                {nextEstimatedOneRepMax !== null
                  ? ` (estimated ${formatLoad(nextEstimatedOneRepMax)} lb)`
                  : ""}
              </p>
            ) : null}
          </>
        )}
      </section>

      <section
        aria-labelledby="exercise-muscles-heading"
        className="mb-4 rounded-md border border-primary/40 bg-surface/40 px-3 py-2.5"
      >
        <h3
          id="exercise-muscles-heading"
          className="font-mono text-[10px] tracking-[0.12em] text-muted-steel uppercase"
        >
          Muscles worked
        </h3>
        {isLoadingMuscleTargets ? (
          <p className="mt-1.5 text-xs text-muted-steel">
            Loading muscle groups...
          </p>
        ) : muscleTargetsError ? (
          <p className="mt-1.5 text-xs text-danger" role="alert">
            Could not load muscle groups: {muscleTargetsError}
          </p>
        ) : (
          <>
            <p className="mt-1.5 text-xs text-starlight">
              <span className="font-semibold text-secondary">Primary:</span>{" "}
              {muscleTargets.primaryMuscleGroups.join(", ") || "None listed"}
            </p>
            <p className="mt-1 text-xs text-starlight">
              <span className="font-semibold text-secondary">Secondary:</span>{" "}
              {muscleTargets.secondaryMuscleGroups.join(", ") || "None listed"}
            </p>
          </>
        )}
      </section>

      {!isLoadingHistory &&
        !exerciseHistoryError &&
        !isLoadingMuscleTargets && (
        <ExerciseHistoryActions
          key={exercise.id}
          exerciseId={exercise.exerciseId}
          muscleGroups={muscleTargetsError ? [] : muscleGroups}
          profileCharacter={profileCharacter}
          previousSets={exerciseHistory?.sets ?? []}
          targetReps={exercise.sets.map((set) => set.targetReps)}
        />
        )}

      <div className="mt-8 border-t border-border/70 pt-6">
        <h3 className="mb-3 font-mono text-[10px] tracking-[0.12em] text-muted-steel uppercase">
          Actual sets // suggested {exercise.prescribedSetCount} sets
        </h3>
        <ol className="divide-y divide-border border-y border-border">
          {exercise.sets.map((set) => {
            const firstWeight = exercise.sets[0]?.actualWeight ?? null;
            const defaultWeight = set.actualWeight ?? firstWeight;

            return (
              <li
                className="grid gap-3 py-3 sm:grid-cols-[5rem_1fr]"
                key={set.setNumber}
              >
                <span className="font-mono text-xs text-muted-steel">
                  Set {set.setNumber}
                  {set.targetReps && (
                    <span className="mt-1 block text-[10px]">
                      Target: {set.targetReps}
                    </span>
                  )}
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-[10px] text-muted-steel">
                    <span>Weight (lb)</span>
                    <WeightInput
                      aria-label={`${exercise.exerciseName} set ${set.setNumber} actual weight in pounds`}
                      className="w-full rounded-md border border-border bg-surface px-3 py-2 text-right text-sm text-starlight outline-none focus:border-secondary disabled:opacity-60"
                      disabled={isSaving}
                      onBlur={() => {
                        if (set.setNumber !== 1) return;
                        updateExercise(exercise.id, (currentExercise) => ({
                          ...currentExercise,
                          sets: inheritFirstSetWeight(currentExercise.sets),
                        }));
                      }}
                      onValueChange={(value) =>
                        updateExercise(exercise.id, (currentExercise) => ({
                          ...currentExercise,
                          sets: applySetWeightChange(
                            currentExercise.sets,
                            set.setNumber,
                            value,
                          ),
                        }))
                      }
                      placeholder={defaultWeight?.toString() ?? "Weight (lb)"}
                      value={set.actualWeight}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-muted-steel">
                    <span>Reps</span>
                    <input
                      aria-label={`${exercise.exerciseName} set ${set.setNumber} actual reps`}
                      className="w-full rounded-md border border-border bg-surface px-3 py-2 text-right text-sm text-starlight outline-none focus:border-secondary disabled:opacity-60"
                      disabled={isSaving}
                      inputMode="numeric"
                      max={1000}
                      min={0}
                      onChange={(event) => {
                        const value = event.target.value;
                        updateExercise(exercise.id, (currentExercise) => ({
                          ...currentExercise,
                          sets: currentExercise.sets.map((currentSet) =>
                            currentSet.setNumber === set.setNumber
                              ? {
                                  ...currentSet,
                                  actualReps:
                                    value === "" ? null : Number(value),
                                }
                              : currentSet,
                          ),
                        }));
                      }}
                      placeholder="Reps"
                      type="number"
                      value={set.actualReps ?? ""}
                    />
                  </label>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <FormField className="mt-5" label="Exercise note (optional)">
        <textarea
          className="min-h-24 w-full resize-y rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-starlight outline-none focus:border-secondary disabled:opacity-60"
          disabled={isSaving}
          maxLength={2000}
          onChange={(event) =>
            updateExercise(exercise.id, (currentExercise) => ({
              ...currentExercise,
              notes: event.target.value,
            }))
          }
          placeholder="How did it feel?"
          value={exercise.notes}
        />
      </FormField>

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button
          variant="outline"
          disabled={isSaving}
          onClick={() => void onSaveProgress(exercise)}
          type="button"
        >
          {isSaving
            ? "Saving..."
            : exercise.completedAt
              ? "Save Changes"
              : "Save Progress"}
        </Button>
        {!exercise.completedAt && (
          <>
            <Button
              variant="secondary"
              disabled={isSaving}
              onClick={() => onAddSet(exercise)}
              type="button"
            >
              Add Set
            </Button>
            <Button
              variant="primary"
              disabled={isSaving}
              onClick={() => void onCompleteExercise(exercise)}
              type="button"
            >
              Complete Exercise
            </Button>
          </>
        )}
      </div>
    </DialogShell>
  );
}
