import { useState } from "react";
import { Button } from "../Atoms/Button";
import { CharacterChat } from "../Molecules/CharacterChat";
import { Spinner } from "../Atoms/Spinner";
import { Toast } from "../Atoms/Toast";
import { DialogShell } from "../Molecules/DialogShell";
import { ConfirmationDialog } from "../Molecules/ConfirmationDialog";
import type { WorkoutSession } from "../../lib/workouts";
import { useActiveWorkoutSession } from "../../hooks/useActiveWorkoutSession";
import { SessionExercisePickerDialog } from "./SessionExercisePickerDialog";
import { useExerciseHistory } from "../../hooks/useExerciseHistory";
import { ActiveWorkoutExerciseDialog } from "./ActiveWorkoutExerciseDialog";

type ActiveWorkoutDashboardProps = {
  onDiscard: () => void;
  onFinish: (routineName: string) => void;
  onSessionChange: (session: WorkoutSession) => void;
  profileName: string;
  motivationQuote: string;
  session: WorkoutSession;
};

export function ActiveWorkoutDashboard({
  onDiscard,
  onFinish,
  onSessionChange,
  profileName,
  motivationQuote,
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

  const {
    history: exerciseHistory,
    isLoading: isLoadingHistory,
    error: exerciseHistoryError,
  } = useExerciseHistory(
    selectedExercise?.exerciseId ?? null,
    session.id,
    completedExercises.map((exercise) => exercise.exerciseId),
  );

  return (
    <section aria-labelledby="active-workout-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="mb-2 font-mono text-[10px] font-bold tracking-[0.2em] text-accent uppercase">
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
        <div className="mb-6">
          <CharacterChat profileName={profileName} message={motivationQuote} />
        </div>
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
        <ActiveWorkoutExerciseDialog
          exercise={selectedExercise}
          exerciseHistory={exerciseHistory}
          exerciseHistoryError={exerciseHistoryError}
          isLoadingHistory={isLoadingHistory}
          isSaving={isSaving}
          onAddSet={addSet}
          onClose={() => setSelectedExerciseId(null)}
          onCompleteExercise={completeExercise}
          onSaveProgress={saveProgress}
          profileName={profileName}
          saveError={error}
          updateExercise={updateExercise}
        />
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

      {notice && (
        <Toast
          notification={notice}
          onDismiss={() => setNotice(null)}
          profileName={profileName}
        />
      )}

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
