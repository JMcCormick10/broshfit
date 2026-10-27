import { Spinner } from "../Atoms/Spinner";
import { Button } from "../Atoms/Button";
import type { WorkoutRoutine } from "../../lib/workouts";
import { useWorkoutBuilder } from "../../hooks/useWorkoutBuilder";
import { AddExerciseDialog } from "./AddExerciseDialog";
import { DialogShell } from "../Molecules/DialogShell";
import { FormField } from "../Molecules/FormField";
import { WorkoutEntryEditor } from "../Molecules/WorkoutEntryEditor";

type WorkoutBuilderDialogProps = {
  onClose: () => void;
  onSaved: (name: string, wasEdited: boolean) => void;
  routine?: WorkoutRoutine;
};

export function WorkoutBuilderDialog({
  onClose,
  onSaved,
  routine,
}: WorkoutBuilderDialogProps) {
  const {
    addExercise,
    addSet,
    closeDialog,
    entries,
    entryDrag,
    exercises,
    formError,
    handleNewExerciseSaved,
    handleSubmit,
    isAddExerciseOpen,
    isLoading,
    isSaving,
    loadError,
    moveEntry,
    name,
    removeEntry,
    removeSet,
    selectedExerciseId,
    setIsAddExerciseOpen,
    setName,
    setSelectedExerciseId,
    updateTargetSet,
  } = useWorkoutBuilder({ onClose, onSaved, routine });

  return (
    <>
      <DialogShell
        closeDisabled={isSaving}
        closeLabel="Close workout builder"
        eyebrow="Workout library // routine editor"
        onClose={closeDialog}
        title={routine ? "Edit Workout Routine" : "Add New Workout Routine"}
        titleId="workout-builder-heading"
        widthClass="max-w-3xl"
        className="max-h-[92vh] overflow-y-auto p-5 sm:p-7"
      >
        <form onSubmit={handleSubmit}>
          <FormField label="Workout name">
            <input
              autoFocus
              className="w-full rounded-md border border-border bg-void px-3.5 py-3 text-starlight outline-none transition placeholder:text-muted-steel/60 focus:border-secondary"
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Upper body ladder"
              required
              value={name}
            />
          </FormField>

          <section aria-labelledby="workout-exercises-heading" className="mt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3
                  id="workout-exercises-heading"
                  className="font-heading text-xl font-bold"
                >
                  Exercises and sets
                </h3>
                <p className="mt-0.5 text-xs text-muted-steel">
                  Reps are optional suggested targets for each set.
                </p>
              </div>
              <Button
                variant="outline-secondary"
                disabled={isLoading || Boolean(loadError)}
                onClick={() => setIsAddExerciseOpen(true)}
                type="button"
              >
                Add New Exercise
              </Button>
            </div>

            {isLoading ? (
              <div className="flex min-h-28 items-center justify-center">
                <Spinner compact label="Loading exercises..." />
              </div>
            ) : loadError ? (
              <p
                className="mt-4 rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm"
                role="alert"
              >
                Could not load exercises: {loadError}
              </p>
            ) : exercises.length === 0 ? (
              <p className="mt-4 border-y border-border py-5 text-sm text-muted-steel">
                The shared exercise list is empty. Add an exercise to start this
                workout.
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <select
                  aria-label="Choose an exercise"
                  className="min-w-0 flex-1 rounded-md border border-border bg-void px-3 py-2.5 text-sm text-starlight outline-none focus:border-secondary"
                  onChange={(event) =>
                    setSelectedExerciseId(event.target.value)
                  }
                  value={selectedExerciseId}
                >
                  {exercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.equipment} · {exercise.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  onClick={() => addExercise(selectedExerciseId)}
                  type="button"
                >
                  Add to workout
                </Button>
              </div>
            )}

            {entries.length > 0 && (
              <ol className="mt-5 divide-y divide-border border-y border-border">
                {entries.map((entry, entryIndex) => {
                  const exercise = exercises.find(
                    (candidate) => candidate.id === entry.exerciseId,
                  );

                  return (
                    <WorkoutEntryEditor
                      dropPosition={
                        entryDrag.dropTarget?.itemId === entry.key
                          ? entryDrag.dropTarget.position
                          : null
                      }
                      entry={entry}
                      entryIndex={entryIndex}
                      exerciseName={exercise?.name ?? "Exercise"}
                      equipment={exercise?.equipment ?? ""}
                      isDragging={entryDrag.draggingId === entry.key}
                      key={entry.key}
                      onAddSet={() => addSet(entry.key)}
                      onChangeSet={(setIndex, value) =>
                        updateTargetSet(entry.key, setIndex, value)
                      }
                      onMove={(offset) => moveEntry(entryIndex, offset)}
                      onPointerDown={(event) => {
                        if (event.button !== 0) return;
                        entryDrag.beginDrag(
                          entry.key,
                          event.pointerId,
                          event.clientX,
                          event.clientY,
                        );
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                      onPointerMove={(event) => {
                        entryDrag.updateDragTarget(
                          event.pointerId,
                          event.clientX,
                          event.clientY,
                        );
                      }}
                      onPointerUp={(event) => {
                        void entryDrag.finishDrag(event.pointerId);
                        if (
                          event.currentTarget.hasPointerCapture(event.pointerId)
                        ) {
                          event.currentTarget.releasePointerCapture(
                            event.pointerId,
                          );
                        }
                      }}
                      onPointerCancel={(event) => {
                        entryDrag.cancelDrag(event.pointerId);
                        if (
                          event.currentTarget.hasPointerCapture(event.pointerId)
                        ) {
                          event.currentTarget.releasePointerCapture(
                            event.pointerId,
                          );
                        }
                      }}
                      onRemove={() => removeEntry(entry.key)}
                      onRemoveSet={(setIndex) => removeSet(entry.key, setIndex)}
                      totalEntries={entries.length}
                    />
                  );
                })}
              </ol>
            )}
          </section>

          {formError && (
            <p className="mt-4 text-sm text-danger" role="alert">
              {formError}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={closeDialog}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={isLoading || Boolean(loadError) || isSaving}
              type="submit"
            >
              {isSaving
                ? "Saving..."
                : routine
                  ? "Save Changes"
                  : "Save Routine"}
            </Button>
          </div>
        </form>
      </DialogShell>

      {isAddExerciseOpen && (
        <AddExerciseDialog
          onClose={() => setIsAddExerciseOpen(false)}
          onSaved={handleNewExerciseSaved}
        />
      )}
    </>
  );
}
