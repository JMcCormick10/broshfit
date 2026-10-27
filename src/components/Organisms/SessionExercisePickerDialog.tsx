import { useState } from "react";
import { Spinner } from "../Atoms/Spinner";
import { Button } from "../Atoms/Button";
import { DialogShell } from "../Molecules/DialogShell";
import { FormField } from "../Molecules/FormField";
import { getExercises, type ExerciseRecord } from "../../lib/exercises";
import { useAsyncData } from "../../hooks/useAsyncData";

type SessionExercisePickerDialogProps = {
  excludeExerciseIds: string[];
  isSaving: boolean;
  onAdd: (exerciseId: string) => Promise<void>;
  onClose: () => void;
};

export function SessionExercisePickerDialog({
  excludeExerciseIds,
  isSaving,
  onAdd,
  onClose,
}: SessionExercisePickerDialogProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const {
    data: exercises,
    error: loadError,
    isLoading,
  } = useAsyncData(getExercises, [], {
    errorMessage: "Could not load exercises.",
    initialData: [] as ExerciseRecord[],
  });

  const availableExercises = exercises.filter(
    (exercise) => !excludeExerciseIds.includes(exercise.id),
  );
  const effectiveSelectedId = availableExercises.some(
    (exercise) => exercise.id === selectedExerciseId,
  )
    ? selectedExerciseId
    : (availableExercises[0]?.id ?? "");

  return (
    <DialogShell
      closeDisabled={isSaving}
      closeLabel="Close exercise picker"
      description="Add an exercise that is not part of this routine to the current workout."
      eyebrow="Active workout // add exercise"
      onClose={onClose}
      title="Add Exercise"
      titleId="session-exercise-picker-heading"
      widthClass="max-w-xl"
      className="p-5 sm:p-7"
    >
      {isLoading ? (
        <div className="flex min-h-32 items-center justify-center">
          <Spinner label="Loading exercises..." />
        </div>
      ) : loadError ? (
        <p
          className="rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm"
          role="alert"
        >
          {loadError}
        </p>
      ) : availableExercises.length === 0 ? (
        <p className="border-y border-border py-8 text-sm text-muted-steel">
          Every exercise is already part of this workout.
        </p>
      ) : (
        <FormField label="Choose an exercise">
          <select
            aria-label="Choose an exercise to add"
            className="w-full rounded-md border border-border bg-void px-3 py-2.5 text-sm text-starlight outline-none focus:border-secondary"
            onChange={(event) => setSelectedExerciseId(event.target.value)}
            value={effectiveSelectedId}
          >
            {availableExercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.equipment} · {exercise.name}
              </option>
            ))}
          </select>
        </FormField>
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
        <Button
          variant="primary"
          disabled={isSaving || isLoading || !effectiveSelectedId}
          onClick={() => void onAdd(effectiveSelectedId)}
          type="button"
        >
          {isSaving ? "Adding..." : "Add Exercise"}
        </Button>
      </div>
    </DialogShell>
  );
}
