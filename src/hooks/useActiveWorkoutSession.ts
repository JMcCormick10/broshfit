import { useState } from "react";
import type { ProfileNotification } from "../constants/profile-copy/notifications";
import type { WorkoutSession, WorkoutSessionExercise } from "../lib/workouts";
import {
  addWorkoutSessionExercise,
  addWorkoutSessionSet,
  completeWorkoutSessionExercise,
  discardWorkoutSession,
  finishWorkoutSession,
  getWorkoutSession,
  reorderCompletedWorkoutExercises,
  saveWorkoutSessionExercise,
} from "../lib/workouts";
import { useConfirmation } from "./useConfirmation";
import { useDragReorder } from "./useDragReorder";

export type ReorderNotice = {
  error: string | null;
  isLoading: boolean;
  message: string;
};

type UseActiveWorkoutSessionOptions = {
  onDiscard: () => void;
  onFinish: (routineName: string) => void;
  onSessionChange: (session: WorkoutSession) => void;
};

export function useActiveWorkoutSession(
  session: WorkoutSession,
  { onDiscard, onFinish, onSessionChange }: UseActiveWorkoutSessionOptions,
) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<ProfileNotification | null>(null);
  const { confirmation, clearConfirmation, requestConfirmation } =
    useConfirmation();
  const [reorderNotice, setReorderNotice] = useState<ReorderNotice | null>(
    null,
  );

  const selectedExercise =
    session.exercises.find((exercise) => exercise.id === selectedExerciseId) ??
    null;
  const pendingExercises = session.exercises.filter(
    (exercise) => exercise.completedAt === null,
  );
  const completedExercises = session.exercises
    .filter((exercise) => exercise.completedAt !== null)
    .sort(
      (first, second) =>
        (first.completedOrder ?? 0) - (second.completedOrder ?? 0),
    );

  function updateExercise(
    exerciseId: string,
    update: (exercise: WorkoutSessionExercise) => WorkoutSessionExercise,
  ) {
    onSessionChange({
      ...session,
      exercises: session.exercises.map((exercise) =>
        exercise.id === exerciseId ? update(exercise) : exercise,
      ),
    });
    setNotice(null);
  }

  async function refreshSession() {
    const updatedSession = await getWorkoutSession(session.id);
    onSessionChange(updatedSession);
  }

  async function persistCompletedOrder(
    reorderedExercises: WorkoutSessionExercise[],
  ) {
    setError(null);
    setReorderNotice({
      error: null,
      isLoading: true,
      message: "Updating completed exercise order...",
    });
    try {
      await reorderCompletedWorkoutExercises(
        session.id,
        reorderedExercises.map((exercise) => exercise.id),
      );
      await refreshSession();
      setReorderNotice({
        error: null,
        isLoading: false,
        message: "Completed exercise order updated.",
      });
    } catch (reorderError: unknown) {
      setReorderNotice({
        error:
          reorderError instanceof Error
            ? reorderError.message
            : "Could not reorder completed exercises.",
        isLoading: false,
        message: "Could not reorder completed exercises.",
      });
    }
  }

  const completedDrag = useDragReorder<WorkoutSessionExercise>({
    getId: (exercise) => exercise.id,
    getTargetId: (element) => element.dataset.completedExercise ?? null,
    items: completedExercises,
    onReorder: persistCompletedOrder,
    targetSelector: "[data-completed-exercise]",
  });

  async function addExerciseToSession(exerciseId: string) {
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      await addWorkoutSessionExercise(session.id, exerciseId);
      await refreshSession();
      setNotice({ type: "session-exercise", action: "added" });
    } catch (addError: unknown) {
      setError(
        addError instanceof Error
          ? addError.message
          : "Could not add this exercise.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveProgress(exercise: WorkoutSessionExercise) {
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      await saveWorkoutSessionExercise(
        exercise.id,
        exercise.sets,
        exercise.notes,
      );
      setNotice({
        type: "session-exercise",
        action: exercise.completedAt ? "changes-saved" : "progress-saved",
        name: exercise.exerciseName,
      });
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save exercise progress.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function addSet(exercise: WorkoutSessionExercise) {
    const setDescription =
      exercise.prescribedSetCount > 0
        ? `This routine suggests ${exercise.prescribedSetCount} sets for ${exercise.exerciseName}. Add another set anyway?`
        : `This routine does not specify a set count for ${exercise.exerciseName}. Add another set?`;

    requestConfirmation({
      title: "Add another set?",
      description: setDescription,
      confirmLabel: "Add Set",
      onConfirm: async () => {
        setIsSaving(true);
        setNotice(null);
        try {
          await addWorkoutSessionSet(exercise.id);
          await refreshSession();
        } finally {
          setIsSaving(false);
        }
      },
    });
  }

  async function completeExercise(exercise: WorkoutSessionExercise) {
    const enteredSetCount = exercise.sets.filter(
      (set) => set.actualReps !== null,
    ).length;
    const needsWarning =
      enteredSetCount < exercise.prescribedSetCount ||
      exercise.sets.some((set) => set.actualReps === null);

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      if (needsWarning) {
        setIsSaving(false);
        requestConfirmation({
          title: "Complete exercise with unfinished sets?",
          description: `Some sets for ${exercise.exerciseName} do not have reps recorded. You can still complete the exercise.`,
          confirmLabel: "Complete Exercise",
          onConfirm: () => completeExerciseNow(exercise, true),
        });
        return;
      }

      await completeExerciseNow(exercise, false);
    } catch (completeError: unknown) {
      setError(
        completeError instanceof Error
          ? completeError.message
          : "Could not complete this exercise.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function completeExerciseNow(
    exercise: WorkoutSessionExercise,
    allowIncomplete: boolean,
  ) {
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      await completeWorkoutSessionExercise(
        exercise.id,
        exercise.sets,
        exercise.notes,
        allowIncomplete,
      );
      const updatedSession = await getWorkoutSession(session.id);
      onSessionChange(updatedSession);
      setSelectedExerciseId(null);
      setNotice({
        type: "session-exercise",
        action: "completed",
        name: exercise.exerciseName,
      });
    } finally {
      setIsSaving(false);
    }
  }

  function endWorkout() {
    const hasIncompleteExercises = pendingExercises.length > 0;
    if (hasIncompleteExercises) {
      requestConfirmation({
        title: "Finish with exercises incomplete?",
        description: `${pendingExercises.length} exercise${pendingExercises.length === 1 ? " is" : "s are"} not complete. Finish this workout anyway?`,
        confirmLabel: "Finish Workout",
        onConfirm: () => finishWorkout(true),
      });
      return;
    }

    void finishWorkout(false);
  }

  async function finishWorkout(allowIncomplete: boolean) {
    setIsSaving(true);
    setError(null);

    try {
      await finishWorkoutSession(session.id, allowIncomplete);
      onFinish(session.routineName);
    } catch (finishError: unknown) {
      setError(
        finishError instanceof Error
          ? finishError.message
          : "Could not finish this workout.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDiscardWorkout() {
    requestConfirmation({
      title: "End workout without saving?",
      description:
        "This will discard the active workout. Recorded reps, notes, and completed exercises will not be saved to your workout history.",
      confirmLabel: "Discard Workout",
      onConfirm: async () => {
        await discardWorkoutSession(session.id);
        onDiscard();
      },
    });
  }

  return {
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
  };
}
