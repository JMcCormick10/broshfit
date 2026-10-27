import { useEffect, useState, type FormEvent } from "react";
import type {
  CompletedWorkoutSummary,
  WorkoutSession,
  WorkoutSessionExercise,
} from "../lib/workouts";
import {
  deleteCompletedWorkout,
  getWorkoutSession,
  updateCompletedWorkoutSession,
} from "../lib/workouts";
import { useConfirmation } from "./useConfirmation";
import { useDragReorder } from "./useDragReorder";

export type CompletedExerciseEditor = WorkoutSessionExercise & {
  key: string;
};

export function toDateTimeInputValue(value: string) {
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

export const MAX_COMPLETED_AT = toDateTimeInputValue(new Date().toISOString());

type UseCompletedWorkoutEditorOptions = {
  onClose: () => void;
  onSaved: (action: "updated" | "deleted") => Promise<void> | void;
  workout: CompletedWorkoutSummary;
};

export function useCompletedWorkoutEditor({
  onClose,
  onSaved,
  workout,
}: UseCompletedWorkoutEditorOptions) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<CompletedExerciseEditor[]>([]);
  const [completedAt, setCompletedAt] = useState(
    toDateTimeInputValue(workout.completedAt),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirmation, clearConfirmation, requestConfirmation } =
    useConfirmation();

  useEffect(() => {
    let isMounted = true;
    // oxlint-disable-next-line react/set-state-in-effect -- reset editor state when a different workout is passed
    setIsLoading(true);
    setError(null);

    if (!workout.sessionId) {
      setError(
        "This completed workout was created before editing was available.",
      );
      setIsLoading(false);
      return;
    }

    getWorkoutSession(workout.sessionId)
      .then((loadedSession) => {
        if (isMounted) {
          setSession(loadedSession);
          setExercises(
            loadedSession.exercises
              .filter((exercise) => exercise.completedAt !== null)
              .sort(
                (first, second) =>
                  (first.completedOrder ?? 0) - (second.completedOrder ?? 0),
              )
              .map((exercise) => ({
                ...exercise,
                key: crypto.randomUUID(),
              })),
          );
          setCompletedAt(toDateTimeInputValue(workout.completedAt));
        }
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load this completed workout.",
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workout]);

  const exerciseDrag = useDragReorder<CompletedExerciseEditor>({
    getId: (exercise) => exercise.id,
    getTargetId: (element) => element.dataset.historyExercise ?? null,
    items: exercises,
    onReorder: setExercises,
    targetSelector: "[data-history-exercise]",
  });

  function updateExercise(
    exerciseKey: string,
    update: (exercise: CompletedExerciseEditor) => CompletedExerciseEditor,
  ) {
    setExercises((currentExercises) =>
      currentExercises.map((exercise) =>
        exercise.key === exerciseKey ? update(exercise) : exercise,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    const completedDate = new Date(completedAt);
    if (Number.isNaN(completedDate.getTime())) {
      setError("Enter a valid completed date and time.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateCompletedWorkoutSession(
        session.id,
        completedDate.toISOString(),
        exercises.map((exercise, index) => ({
          sessionExerciseId: exercise.id,
          sets: exercise.sets.map((set) => ({
            setNumber: set.setNumber,
            actualReps: set.actualReps,
            actualWeight: set.actualWeight,
          })),
          notes: exercise.notes,
          completedOrder: index + 1,
        })),
      );
      await onSaved("updated");
      onClose();
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this completed workout.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function requestDelete() {
    if (!session) return;

    requestConfirmation({
      title: "Delete this completed workout?",
      description:
        "This will permanently delete this workout and all of its sets, reps, and notes from your history. This action is permanent and cannot be undone.",
      confirmLabel: "Delete Workout",
      onConfirm: async () => {
        await deleteCompletedWorkout(session.id);
        await onSaved("deleted");
        onClose();
      },
    });
  }

  return {
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
  };
}
