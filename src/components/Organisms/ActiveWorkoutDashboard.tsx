import { useState } from "react";
import { Button } from "../Atoms/Button";
import { Spinner } from "../Atoms/Spinner";
import { Toast } from "../Atoms/Toast";
import { FormField } from "../Molecules/FormField";
import { DialogShell } from "../Molecules/DialogShell";
import { ConfirmationDialog } from "../Molecules/ConfirmationDialog";
import type { WorkoutSession } from "../../lib/workouts";
import {
  applySetWeightChange,
  inheritFirstSetWeight,
} from "../../lib/workouts";
import { useActiveWorkoutSession } from "../../hooks/useActiveWorkoutSession";
import { SessionExercisePickerDialog } from "./SessionExercisePickerDialog";
import {
  formatExerciseHistorySets,
  useExerciseHistory,
} from "../../hooks/useExerciseHistory";

type ActiveWorkoutDashboardProps = {
  onDiscard: () => void;
  onFinish: (routineName: string) => void;
  onSessionChange: (session: WorkoutSession) => void;
  session: WorkoutSession;
};

export function ActiveWorkoutDashboard({
  onDiscard,
  onFinish,
  onSessionChange,
  session,
}: ActiveWorkoutDashboardProps) {
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const {
    addExerciseToSession,
    addSet,
    clearConfirmation,
    completedDrag,
    completedExercises,
    completeExercise,
    confirmDiscardWorkout,
    confirmation,
    endWorkout,
    error,
    isSaving,
    notice,
    pendingExercises,
    reorderNotice,
    saveProgress,
    selectedExercise,
    setNotice,
    setReorderNotice,
    setSelectedExerciseId,
    updateExercise,
  } = useActiveWorkoutSession(session, {
    onDiscard,
    onFinish,
    onSessionChange,
  });

  const { history: exerciseHistory, isLoading: isLoadingHistory } =
    useExerciseHistory(
      selectedExercise?.exerciseId ?? null,
      session.id,
      completedExercises.map((exercise) => exercise.exerciseId),
    );

  return (
    <section aria-labelledby="active-workout-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="mb-2 font-mono text-[10px] font-bold tracking-[0.2em] text-primary uppercase">
            Active workout
          </p>
          <h1
            id="active-workout-heading"
            className="font-heading text-4xl leading-none font-bold sm:text-5xl"
          >
            {session.routineName}
          </h1>
          <p className="mt-2 font-mono text-xs text-muted-steel">
            Started{" "}
            {new Date(session.startedAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline-danger-small"
            disabled={isSaving}
            onClick={confirmDiscardWorkout}
            type="button"
          >
            Discard Workout
          </Button>
          <Button
            variant="primary"
            disabled={isSaving}
            onClick={() => void endWorkout()}
            type="button"
          >
            Finish Workout
          </Button>
        </div>
      </div>

      {error && (
        <p
          className="mt-5 rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="mt-6 max-w-3xl">
        <section aria-labelledby="remaining-exercises-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              id="remaining-exercises-heading"
              className="font-mono text-[10px] tracking-[0.16em] text-muted-steel uppercase"
            >
              Exercises // {pendingExercises.length} remaining
            </h2>
            <Button
              variant="outline-small"
              disabled={isSaving}
              onClick={() => setIsExercisePickerOpen(true)}
              type="button"
            >
              Add Exercise
            </Button>
          </div>
          {pendingExercises.length === 0 ? (
            <p className="border-y border-border py-4 text-sm text-muted-steel">
              All exercises completed.
            </p>
          ) : (
            <ol className="divide-y divide-border border-y border-border">
              {pendingExercises.map((exercise) => (
                <li key={exercise.id}>
                  <Button
                    variant="session-exercise"
                    aria-pressed={selectedExercise?.id === exercise.id}
                    onClick={() => setSelectedExerciseId(exercise.id)}
                    type="button"
                  >
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate font-semibold">
                        {exercise.routinePosition}. {exercise.exerciseName}
                      </span>
                      <span className="mt-0.5 block font-mono text-[10px] text-muted-steel">
                        {exercise.equipment} · {exercise.sets.length} sets
                      </span>
                    </span>
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </section>

        {completedExercises.length > 0 && (
          <section
            aria-labelledby="completed-exercises-heading"
            className="mt-8"
          >
            <h2
              id="completed-exercises-heading"
              className="mb-3 font-mono text-[10px] tracking-[0.16em] text-secondary uppercase"
            >
              Completed // in order
            </h2>
            <ol className="divide-y divide-border border-y border-border">
              {completedExercises.map((exercise) => (
                <li
                  className={`flex items-center gap-2 transition ${completedDrag.draggingId === exercise.id ? "opacity-50" : ""} ${completedDrag.dropTarget?.itemId === exercise.id ? "rounded ring-1 ring-secondary/60" : ""}`}
                  data-completed-exercise={exercise.id}
                  key={exercise.id}
                >
                  <Button
                    variant="drag-handle"
                    aria-label={`Drag ${exercise.exerciseName} to reorder completed exercises`}
                    disabled={isSaving}
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;
                      completedDrag.beginDrag(
                        exercise.id,
                        event.pointerId,
                        event.clientX,
                        event.clientY,
                      );
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) =>
                      completedDrag.updateDragTarget(
                        event.pointerId,
                        event.clientX,
                        event.clientY,
                      )
                    }
                    onPointerUp={(event) => {
                      void completedDrag.finishDrag(event.pointerId);
                      if (
                        event.currentTarget.hasPointerCapture(event.pointerId)
                      ) {
                        event.currentTarget.releasePointerCapture(
                          event.pointerId,
                        );
                      }
                    }}
                    onPointerCancel={(event) => {
                      completedDrag.cancelDrag(event.pointerId);
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
                  <Button
                    variant="menu-item"
                    onClick={() => setSelectedExerciseId(exercise.id)}
                    type="button"
                  >
                    <span className="mr-2 font-mono text-xs text-secondary">
                      {String(exercise.completedOrder).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-left">
                      {exercise.exerciseName}
                    </span>
                    <span aria-hidden="true" className="text-secondary">
                      ✓
                    </span>
                  </Button>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      {selectedExercise && (
        <DialogShell
          closeDisabled={isSaving}
          closeLabel="Close exercise"
          eyebrow={selectedExercise.equipment || "Workout exercise"}
          onClose={() => setSelectedExerciseId(null)}
          title={selectedExercise.exerciseName}
          titleId="selected-exercise-heading"
          widthClass="max-w-2xl"
          className="max-h-[90vh] overflow-y-auto p-5 sm:p-7"
        >
          {error && (
            <p
              className="mb-4 rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm"
              role="alert"
            >
              {error}
            </p>
          )}

          {selectedExercise.completedAt && (
            <p className="mb-4 rounded-md border border-secondary/40 px-3 py-2 font-mono text-[10px] text-secondary uppercase">
              Completed #{selectedExercise.completedOrder}
            </p>
          )}

          {isLoadingHistory ? (
            <p className="mb-4 text-xs text-muted-steel">
              Checking your last session...
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
              <details className="mt-2" key={selectedExercise.id}>
                <summary className="inline-flex cursor-pointer list-none items-center rounded-md border border-secondary/40 px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-secondary/10 [&::-webkit-details-marker]:hidden">
                  Show more context
                </summary>
                <div className="mt-2 space-y-1.5 border-t border-border pt-2 text-xs leading-5 text-muted-steel">
                  {exerciseHistory.contextSentences.map((sentence) => (
                    <p key={sentence}>{sentence}</p>
                  ))}
                </div>
              </details>
            </div>
          ) : null}

          <div>
            <h3 className="mb-3 font-mono text-[10px] tracking-[0.12em] text-muted-steel uppercase">
              Actual sets // suggested {selectedExercise.prescribedSetCount}{" "}
              sets
            </h3>
            <ol className="divide-y divide-border border-y border-border">
              {selectedExercise.sets.map((set) => {
                const firstWeight =
                  selectedExercise.sets[0]?.actualWeight ?? "";
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
                        <span>Weight</span>
                        <input
                          aria-label={`${selectedExercise.exerciseName} set ${set.setNumber} actual weight`}
                          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-right text-sm text-starlight outline-none focus:border-secondary disabled:opacity-60"
                          disabled={isSaving}
                          onBlur={() => {
                            if (set.setNumber !== 1) return;
                            updateExercise(selectedExercise.id, (exercise) => ({
                              ...exercise,
                              sets: inheritFirstSetWeight(exercise.sets),
                            }));
                          }}
                          onChange={(event) =>
                            updateExercise(selectedExercise.id, (exercise) => ({
                              ...exercise,
                              sets: applySetWeightChange(
                                exercise.sets,
                                set.setNumber,
                                event.target.value === ""
                                  ? null
                                  : event.target.value,
                              ),
                            }))
                          }
                          placeholder={defaultWeight || "Weight"}
                          type="text"
                          value={set.actualWeight ?? ""}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[10px] text-muted-steel">
                        <span>Reps</span>
                        <input
                          aria-label={`${selectedExercise.exerciseName} set ${set.setNumber} actual reps`}
                          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-right text-sm text-starlight outline-none focus:border-secondary disabled:opacity-60"
                          disabled={isSaving}
                          inputMode="numeric"
                          max={1000}
                          min={0}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateExercise(selectedExercise.id, (exercise) => ({
                              ...exercise,
                              sets: exercise.sets.map((currentSet) =>
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
                updateExercise(selectedExercise.id, (exercise) => ({
                  ...exercise,
                  notes: event.target.value,
                }))
              }
              placeholder="How did it feel?"
              value={selectedExercise.notes}
            />
          </FormField>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={() => void saveProgress(selectedExercise)}
              type="button"
            >
              {isSaving
                ? "Saving..."
                : selectedExercise.completedAt
                  ? "Save Changes"
                  : "Save Progress"}
            </Button>
            {!selectedExercise.completedAt && (
              <>
                <Button
                  variant="secondary"
                  disabled={isSaving}
                  onClick={() => void addSet(selectedExercise)}
                  type="button"
                >
                  Add Set
                </Button>
                <Button
                  variant="primary"
                  disabled={isSaving}
                  onClick={() => void completeExercise(selectedExercise)}
                  type="button"
                >
                  Complete Exercise
                </Button>
              </>
            )}
          </div>
        </DialogShell>
      )}

      {isExercisePickerOpen && (
        <SessionExercisePickerDialog
          excludeExerciseIds={session.exercises.map(
            (exercise) => exercise.exerciseId,
          )}
          isSaving={isSaving}
          onAdd={async (exerciseId) => {
            await addExerciseToSession(exerciseId);
            setIsExercisePickerOpen(false);
          }}
          onClose={() => setIsExercisePickerOpen(false)}
        />
      )}

      {confirmation && (
        <ConfirmationDialog
          confirmLabel={confirmation.confirmLabel}
          description={confirmation.description}
          onCancel={clearConfirmation}
          onConfirm={confirmation.onConfirm}
          title={confirmation.title}
        />
      )}

      {notice && <Toast message={notice} onDismiss={() => setNotice(null)} />}

      {reorderNotice && (
        <DialogShell
          closeDisabled={reorderNotice.isLoading}
          closeLabel="Dismiss completed exercise order update"
          description={reorderNotice.message}
          eyebrow="Workout // completed order"
          onClose={() => setReorderNotice(null)}
          title="Exercise Order"
          titleId="completed-order-notice-heading"
          widthClass="max-w-md"
          className="p-6 sm:p-8"
        >
          {reorderNotice.isLoading ? (
            <Spinner label={reorderNotice.message} />
          ) : reorderNotice.error ? (
            <p
              className="mb-4 rounded-md border border-danger/40 bg-danger/5 px-3 py-2.5 text-sm"
              role="alert"
            >
              {reorderNotice.error}
            </p>
          ) : null}

          {!reorderNotice.isLoading && (
            <div className="flex justify-end border-t border-border pt-4">
              <Button
                variant="primary"
                onClick={() => setReorderNotice(null)}
                type="button"
              >
                Dismiss
              </Button>
            </div>
          )}
        </DialogShell>
      )}
    </section>
  );
}
