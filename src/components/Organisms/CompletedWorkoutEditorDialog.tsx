import { Button } from "../Atoms/Button";
import { Spinner } from "../Atoms/Spinner";
import { DialogShell } from "../Molecules/DialogShell";
import { ConfirmationDialog } from "../Molecules/ConfirmationDialog";
import { FormField } from "../Molecules/FormField";
import type { CompletedWorkoutSummary } from "../../lib/workouts";
import {
  applySetWeightChange,
  inheritFirstSetWeight,
} from "../../lib/workouts";
import {
  MAX_COMPLETED_AT,
  useCompletedWorkoutEditor,
} from "../../hooks/useCompletedWorkoutEditor";

type CompletedWorkoutEditorDialogProps = {
  onClose: () => void;
  onSaved: (action: "updated" | "deleted") => Promise<void> | void;
  workout: CompletedWorkoutSummary;
};

export function CompletedWorkoutEditorDialog({
  onClose,
  onSaved,
  workout,
}: CompletedWorkoutEditorDialogProps) {
  const {
    clearConfirmation,
    completedAt,
    confirmation,
    error,
    exerciseDrag,
    exercises,
    handleSubmit,
    isLoading,
    isSaving,
    requestDelete,
    session,
    setCompletedAt,
    updateExercise,
  } = useCompletedWorkoutEditor({ onClose, onSaved, workout });

  return (
    <DialogShell
      closeDisabled={isSaving}
      closeLabel="Close completed workout editor"
      description={`Edit completed exercises, reps, notes, order, and date for ${workout.routineName}.`}
      eyebrow="Workout history // edit"
      onClose={onClose}
      title="Edit Completed Workout"
      titleId="completed-workout-editor-heading"
      widthClass="max-w-4xl"
      className="max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Spinner label="Loading completed workout..." />
        </div>
      ) : error && !session ? (
        <p
          className="rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm"
          role="alert"
        >
          {error}
        </p>
      ) : session ? (
        <form onSubmit={handleSubmit}>
          <div className="mb-5 flex justify-end">
            <Button
              variant="danger"
              disabled={isSaving}
              onClick={requestDelete}
              type="button"
            >
              Delete Workout
            </Button>
          </div>

          <FormField label="Completed date">
            <input
              className="min-w-0 max-w-full w-full rounded-md border border-border bg-void px-3.5 py-3 text-starlight outline-none transition focus:border-secondary"
              max={MAX_COMPLETED_AT}
              onChange={(event) => setCompletedAt(event.target.value)}
              required
              type="datetime-local"
              value={completedAt}
            />
          </FormField>

          <ol className="mt-6 divide-y divide-border border-y border-border">
            {exercises.map((exercise, index) => (
              <li
                className={`py-4 transition ${exerciseDrag.draggingId === exercise.id ? "opacity-50" : ""} ${exerciseDrag.dropTarget?.itemId === exercise.id ? "rounded ring-1 ring-secondary/60" : ""}`}
                data-history-exercise={exercise.id}
                key={exercise.key}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="drag-handle"
                      aria-label={`Drag ${exercise.exerciseName} to reorder completed exercises`}
                      onPointerDown={(event) => {
                        if (event.button !== 0) return;
                        exerciseDrag.beginDrag(
                          exercise.id,
                          event.pointerId,
                          event.clientX,
                          event.clientY,
                        );
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                      onPointerMove={(event) =>
                        exerciseDrag.updateDragTarget(
                          event.pointerId,
                          event.clientX,
                          event.clientY,
                        )
                      }
                      onPointerUp={(event) => {
                        void exerciseDrag.finishDrag(event.pointerId);
                        if (
                          event.currentTarget.hasPointerCapture(event.pointerId)
                        ) {
                          event.currentTarget.releasePointerCapture(
                            event.pointerId,
                          );
                        }
                      }}
                      onPointerCancel={(event) => {
                        exerciseDrag.cancelDrag(event.pointerId);
                        if (
                          event.currentTarget.hasPointerCapture(event.pointerId)
                        ) {
                          event.currentTarget.releasePointerCapture(
                            event.pointerId,
                          );
                        }
                      }}
                      type="button"
                    >
                      <span aria-hidden="true">⠿</span>
                    </Button>
                    <div>
                      <p className="font-semibold">
                        <span className="mr-2 font-mono text-xs text-muted-steel">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {exercise.exerciseName}
                      </p>
                      <p className="mt-0.5 pl-8 text-xs text-muted-steel">
                        {exercise.equipment}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {exercise.sets.map((set) => (
                    <div
                      className="flex items-center justify-between gap-3 text-sm text-muted-steel"
                      key={set.setNumber}
                    >
                      <span>Set {set.setNumber}</span>
                      {set.targetReps && (
                        <span className="min-w-0 flex-1 text-right text-xs">
                          Target: {set.targetReps}
                        </span>
                      )}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-[10px]">
                          <span>Weight</span>
                          <input
                            aria-label={`${exercise.exerciseName} set ${set.setNumber} actual weight`}
                            className="w-24 rounded-md border border-border bg-surface px-3 py-2 text-right text-sm text-starlight outline-none focus:border-secondary"
                            onBlur={() => {
                              if (set.setNumber !== 1) return;
                              updateExercise(
                                exercise.key,
                                (currentExercise) => ({
                                  ...currentExercise,
                                  sets: inheritFirstSetWeight(
                                    currentExercise.sets,
                                  ),
                                }),
                              );
                            }}
                            onChange={(event) =>
                              updateExercise(
                                exercise.key,
                                (currentExercise) => ({
                                  ...currentExercise,
                                  sets: applySetWeightChange(
                                    currentExercise.sets,
                                    set.setNumber,
                                    event.target.value === ""
                                      ? null
                                      : event.target.value,
                                  ),
                                }),
                              )
                            }
                            placeholder={
                              set.actualWeight ??
                              exercise.sets[0]?.actualWeight ??
                              "Weight"
                            }
                            type="text"
                            value={set.actualWeight ?? ""}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-[10px]">
                          <span>Reps</span>
                          <input
                            aria-label={`${exercise.exerciseName} set ${set.setNumber} actual reps`}
                            className="w-24 rounded-md border border-border bg-surface px-3 py-2 text-right text-sm text-starlight outline-none focus:border-secondary"
                            inputMode="numeric"
                            max={1000}
                            min={0}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateExercise(
                                exercise.key,
                                (currentExercise) => ({
                                  ...currentExercise,
                                  sets: currentExercise.sets.map(
                                    (currentSet) =>
                                      currentSet.setNumber === set.setNumber
                                        ? {
                                            ...currentSet,
                                            actualReps:
                                              value === ""
                                                ? null
                                                : Number(value),
                                          }
                                        : currentSet,
                                  ),
                                }),
                              );
                            }}
                            placeholder="Reps"
                            type="number"
                            value={set.actualReps ?? ""}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <FormField className="mt-4" label="Exercise note">
                  <textarea
                    className="min-h-20 w-full resize-y rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-starlight outline-none focus:border-secondary"
                    maxLength={2000}
                    onChange={(event) =>
                      updateExercise(exercise.key, (currentExercise) => ({
                        ...currentExercise,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Optional note"
                    value={exercise.notes}
                  />
                </FormField>
              </li>
            ))}
          </ol>

          {error && (
            <p
              className="mt-4 rounded-md border border-danger/40 bg-danger/5 px-3 py-2.5 text-sm"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Cancel
            </Button>
            <Button variant="primary" disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : "Save Workout"}
            </Button>
          </div>
        </form>
      ) : null}
      {confirmation && (
        <ConfirmationDialog
          confirmLabel={confirmation.confirmLabel}
          danger
          description={confirmation.description}
          onCancel={clearConfirmation}
          onConfirm={confirmation.onConfirm}
          title={confirmation.title}
        />
      )}
    </DialogShell>
  );
}
