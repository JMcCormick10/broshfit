import { useState, type FormEvent } from "react";
import { getExercises, type ExerciseRecord } from "../lib/exercises";
import {
  createWorkout,
  updateWorkout,
  type WorkoutExerciseInput,
  type WorkoutRoutine,
} from "../lib/workouts";
import { useAsyncData } from "./useAsyncData";
import { useDragReorder } from "./useDragReorder";

export type WorkoutBuilderEntry = WorkoutExerciseInput & {
  key: string;
};

type UseWorkoutBuilderOptions = {
  onClose: () => void;
  onSaved: (name: string, wasEdited: boolean) => void;
  routine?: WorkoutRoutine;
};

export function useWorkoutBuilder({
  onClose,
  onSaved,
  routine,
}: UseWorkoutBuilderOptions) {
  const [name, setName] = useState(routine?.name ?? "");
  const [entries, setEntries] = useState<WorkoutBuilderEntry[]>(
    () =>
      routine?.entries.map((entry) => ({
        ...entry,
        key: crypto.randomUUID(),
      })) ?? [],
  );
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: exercises,
    error: loadError,
    isLoading,
    reload: reloadExercises,
  } = useAsyncData(getExercises, [], {
    errorMessage: "Could not load exercises.",
    initialData: [] as ExerciseRecord[],
    onLoaded: (loadedExercises) =>
      setSelectedExerciseId(
        (current) => current || loadedExercises[0]?.id || "",
      ),
  });

  const entryDrag = useDragReorder<WorkoutBuilderEntry>({
    getId: (entry) => entry.key,
    getTargetId: (element) => element.dataset.workoutEntry ?? null,
    items: entries,
    onReorder: setEntries,
    targetSelector: "[data-workout-entry]",
  });

  function addExercise(exerciseId: string) {
    setEntries((currentEntries) => [
      ...currentEntries,
      {
        key: crypto.randomUUID(),
        exerciseId,
        targetSets: [{ reps: "10" }],
      },
    ]);
  }

  function updateEntry(
    entryKey: string,
    update: (entry: WorkoutBuilderEntry) => WorkoutBuilderEntry,
  ) {
    setEntries((currentEntries) =>
      currentEntries.map((entry) =>
        entry.key === entryKey ? update(entry) : entry,
      ),
    );
  }

  function updateTargetSet(entryKey: string, setIndex: number, value: string) {
    updateEntry(entryKey, (entry) => ({
      ...entry,
      targetSets: entry.targetSets.map((set, index) =>
        index === setIndex ? { reps: value === "" ? null : value } : set,
      ),
    }));
  }

  function addSet(entryKey: string) {
    updateEntry(entryKey, (entry) => ({
      ...entry,
      targetSets: [
        ...entry.targetSets,
        { reps: entry.targetSets[entry.targetSets.length - 1]?.reps ?? null },
      ],
    }));
  }

  function removeSet(entryKey: string, setIndex: number) {
    updateEntry(entryKey, (entry) => ({
      ...entry,
      targetSets: entry.targetSets.filter((_, index) => index !== setIndex),
    }));
  }

  function removeEntry(entryKey: string) {
    setEntries((currentEntries) =>
      currentEntries.filter((entry) => entry.key !== entryKey),
    );
  }

  function moveEntry(entryIndex: number, offset: -1 | 1) {
    const nextIndex = entryIndex + offset;
    if (nextIndex < 0 || nextIndex >= entries.length) return;

    setEntries((currentEntries) => {
      const reordered = [...currentEntries];
      [reordered[entryIndex], reordered[nextIndex]] = [
        reordered[nextIndex],
        reordered[entryIndex],
      ];
      return reordered;
    });
  }

  async function handleNewExerciseSaved(
    _displayName: string,
    exerciseId: string,
    wasEdited: boolean,
  ) {
    setIsAddExerciseOpen(false);
    await reloadExercises();
    if (!wasEdited) {
      setSelectedExerciseId(exerciseId);
      addExercise(exerciseId);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Enter a workout name.");
      return;
    }

    if (entries.length === 0) {
      setFormError("Add at least one exercise.");
      return;
    }

    setIsSaving(true);

    try {
      const workoutInput = {
        name: name.trim(),
        exercises: entries.map(({ exerciseId, targetSets }) => ({
          exerciseId,
          targetSets,
        })),
      };

      if (routine) {
        await updateWorkout(routine.id, workoutInput);
      } else {
        await createWorkout(workoutInput);
      }

      onSaved(name.trim(), Boolean(routine));
      onClose();
    } catch (error: unknown) {
      setFormError(
        error instanceof Error ? error.message : "Could not save this workout.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function closeDialog() {
    if (!isSaving) onClose();
  }

  return {
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
  };
}
