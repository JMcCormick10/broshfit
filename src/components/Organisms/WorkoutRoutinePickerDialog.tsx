import { useState } from "react";
import { Spinner } from "../Atoms/Spinner";
import { Button } from "../Atoms/Button";
import { DialogShell } from "../Molecules/DialogShell";
import { getWorkoutRoutines, type WorkoutRoutine } from "../../lib/workouts";
import { useAsyncData } from "../../hooks/useAsyncData";

type WorkoutRoutinePickerDialogProps = {
  onClose: () => void;
  onStart: (routineId: string) => Promise<void>;
};

export function WorkoutRoutinePickerDialog({
  onClose,
  onStart,
}: WorkoutRoutinePickerDialogProps) {
  const [selectedRoutineId, setSelectedRoutineId] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    data: routines,
    error: loadError,
    isLoading,
  } = useAsyncData(() => getWorkoutRoutines(false), [], {
    errorMessage: "Could not load workout routines.",
    initialData: [] as WorkoutRoutine[],
    onLoaded: (activeRoutines) =>
      setSelectedRoutineId(activeRoutines[0]?.id ?? ""),
  });

  async function handleStart() {
    if (!selectedRoutineId) return;
    setIsStarting(true);
    setActionError(null);

    try {
      await onStart(selectedRoutineId);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not start this workout.",
      );
      setIsStarting(false);
    }
  }

  return (
    <DialogShell
      closeDisabled={isStarting}
      closeLabel="Close routine picker"
      description="Choose an active routine to begin."
      eyebrow="Training log // new session"
      onClose={onClose}
      title="Start New Workout"
      titleId="start-workout-heading"
      widthClass="max-w-xl"
      className="p-5 sm:p-7"
    >
      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner label="Loading active workout routines..." />
        </div>
      ) : loadError && routines.length === 0 ? (
        <p
          className="rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm"
          role="alert"
        >
          {loadError}
        </p>
      ) : routines.length === 0 ? (
        <p className="border-y border-border py-8 text-sm text-muted-steel">
          No active workout routines are available.
        </p>
      ) : (
        <div className="space-y-2">
          {routines.map((routine) => (
            <Button
              key={routine.id}
              variant="profile"
              selected={selectedRoutineId === routine.id}
              aria-pressed={selectedRoutineId === routine.id}
              onClick={() => setSelectedRoutineId(routine.id)}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-heading text-xl font-bold">
                  {routine.name}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] text-muted-steel">
                  {routine.entries.length} exercises
                </span>
              </span>
            </Button>
          ))}
        </div>
      )}

      {actionError && routines.length > 0 && (
        <p
          className="mt-4 rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm"
          role="alert"
        >
          {actionError}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
        <Button
          variant="outline"
          disabled={isStarting}
          onClick={onClose}
          type="button"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={
            isLoading || Boolean(loadError) || !selectedRoutineId || isStarting
          }
          onClick={() => void handleStart()}
          type="button"
        >
          {isStarting ? "Starting..." : "Start Workout"}
        </Button>
      </div>
    </DialogShell>
  );
}
