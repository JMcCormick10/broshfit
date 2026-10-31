import { getExerciseHistoryContextMessage } from "../../constants/profile-copy";
import {
  applySetWeightChange,
  inheritFirstSetWeight,
  type ExerciseHistory,
  type WorkoutSessionExercise,
} from "../../lib/workouts";
import { formatExerciseHistorySets } from "../../hooks/useExerciseHistory";
import { Button } from "../Atoms/Button";
import { WeightInput } from "../Atoms/WeightInput";
import { DialogShell } from "../Molecules/DialogShell";
import { ExerciseHistoryActions } from "../Molecules/ExerciseHistoryActions";
import { FormField } from "../Molecules/FormField";

type ActiveWorkoutExerciseDialogProps = {
  exercise: WorkoutSessionExercise;
  exerciseHistory: ExerciseHistory | null;
  exerciseHistoryError: string | null;
  isLoadingHistory: boolean;
  isSaving: boolean;
  onAddSet: (exercise: WorkoutSessionExercise) => void;
  onClose: () => void;
  onCompleteExercise: (exercise: WorkoutSessionExercise) => void;
  onSaveProgress: (exercise: WorkoutSessionExercise) => Promise<void>;
  profileName: string;
  saveError: string | null;
  updateExercise: (
    exerciseId: string,
    update: (exercise: WorkoutSessionExercise) => WorkoutSessionExercise,
  ) => void;
};

export function ActiveWorkoutExerciseDialog({
  exercise,
  exerciseHistory,
  exerciseHistoryError,
  isLoadingHistory,
  isSaving,
  onAddSet,
  onClose,
  onCompleteExercise,
  onSaveProgress,
  profileName,
  saveError,
  updateExercise,
}: ActiveWorkoutExerciseDialogProps) {
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
            Last time //{" "}
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
      ) : null}

      {!isLoadingHistory && !exerciseHistoryError && (
        <ExerciseHistoryActions
          key={exercise.id}
          contextMessage={
            exerciseHistory
              ? getExerciseHistoryContextMessage(
                  profileName,
                  exerciseHistory.contextSentences,
                )
              : null
          }
          exerciseId={exercise.exerciseId}
          profileName={profileName}
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
