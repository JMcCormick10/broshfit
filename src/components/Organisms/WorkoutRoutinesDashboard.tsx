import { useState } from "react";
import { Spinner } from "../Atoms/Spinner";
import { Button } from "../Atoms/Button";
import {
  deleteWorkout,
  getWorkoutRoutines,
  setWorkoutArchived,
  type WorkoutRoutine,
} from "../../lib/workouts";
import { useAsyncData } from "../../hooks/useAsyncData";

type WorkoutRoutinesDashboardProps = {
  onAdd: () => void;
  onChanged: (message: string) => void;
  onEdit: (routine: WorkoutRoutine) => void;
  refreshKey: number;
};

export function WorkoutRoutinesDashboard({
  onAdd,
  onChanged,
  onEdit,
  refreshKey,
}: WorkoutRoutinesDashboardProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [routineToDelete, setRoutineToDelete] = useState<WorkoutRoutine | null>(
    null,
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    data: routines,
    error: loadError,
    isLoading,
  } = useAsyncData(
    () => getWorkoutRoutines(showArchived),
    [showArchived, refreshKey],
    {
      errorMessage: "Could not load workout routines.",
      initialData: [] as WorkoutRoutine[],
    },
  );

  async function handleArchive(
    routine: WorkoutRoutine,
    shouldArchive: boolean,
  ) {
    setIsUpdating(true);
    setActionError(null);

    try {
      await setWorkoutArchived(routine.id, shouldArchive);
      onChanged(
        `${shouldArchive ? "Archived" : "Restored"} workout routine: ${routine.name}.`,
      );
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not update this workout routine.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function confirmDelete() {
    if (!routineToDelete) return;
    setIsUpdating(true);
    setActionError(null);

    try {
      const wasArchived = await deleteWorkout(routineToDelete.id);
      onChanged(
        wasArchived
          ? `${routineToDelete.name} has completed workouts and was archived instead of deleted.`
          : `Deleted workout routine: ${routineToDelete.name}.`,
      );
      setRoutineToDelete(null);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not delete this workout routine.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <section aria-labelledby="workout-routines-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="mb-2 font-mono text-[10px] font-bold tracking-[0.2em] text-primary uppercase">
            Shared training plans
          </p>
          <h1
            id="workout-routines-heading"
            className="font-heading text-4xl leading-none font-bold sm:text-5xl"
          >
            Workout Routines
          </h1>
        </div>
        {!showArchived && (
          <Button variant="primary" onClick={onAdd} type="button">
            Add New Workout Routine
          </Button>
        )}
      </div>

      <div
        aria-label="Routine status"
        className="mt-5 inline-flex border-b border-border"
        role="tablist"
      >
        <Button
          variant="tab"
          selected={!showArchived}
          aria-selected={!showArchived}
          onClick={() => setShowArchived(false)}
          role="tab"
          type="button"
        >
          Active
        </Button>
        <Button
          variant="tab"
          selected={showArchived}
          aria-selected={showArchived}
          onClick={() => setShowArchived(true)}
          role="tab"
          type="button"
        >
          Archived
        </Button>
      </div>

      {actionError && (
        <p
          className="mt-5 rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm"
          role="alert"
        >
          {actionError}
        </p>
      )}

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Spinner label="Loading workout routines..." />
        </div>
      ) : loadError ? (
        <p
          className="mt-6 rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm"
          role="alert"
        >
          Could not load workout routines: {loadError}
        </p>
      ) : routines.length === 0 ? (
        <p className="mt-6 border-y border-border py-8 text-sm text-muted-steel">
          {showArchived
            ? "There are no archived workout routines."
            : "No workout routines have been created yet."}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border border-b border-border">
          {routines.map((routine) => (
            <li className="py-5" key={routine.id}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-2xl font-bold">
                    {routine.name}
                  </h2>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    variant="outline-small"
                    disabled={isUpdating}
                    onClick={() => onEdit(routine)}
                    type="button"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline-small"
                    disabled={isUpdating}
                    onClick={() => void handleArchive(routine, !showArchived)}
                    type="button"
                  >
                    {showArchived ? "Restore" : "Archive"}
                  </Button>
                  <Button
                    variant="outline-danger-small"
                    disabled={isUpdating}
                    onClick={() => setRoutineToDelete(routine)}
                    type="button"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {routineToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <section
            aria-labelledby="delete-routine-heading"
            aria-modal="true"
            className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-2xl shadow-black/60"
            role="alertdialog"
          >
            <h2
              id="delete-routine-heading"
              className="font-heading text-2xl font-bold"
            >
              Delete {routineToDelete.name}?
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-steel">
              If completed workouts use this routine, it will be archived
              instead of deleted.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={isUpdating}
                onClick={() => setRoutineToDelete(null)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={isUpdating}
                onClick={() => void confirmDelete()}
                type="button"
              >
                {isUpdating ? "Working..." : "Delete Routine"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
