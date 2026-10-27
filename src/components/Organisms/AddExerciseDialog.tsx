import { useState, type FormEvent } from "react";
import { Spinner } from "../Atoms/Spinner";
import {
  createExercise,
  updateExercise,
  type ExerciseRecord,
} from "../../lib/exercises";
import { getMuscleGroups, type MuscleGroup } from "../../lib/muscle-groups";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { ExerciseEquipment } from "../../lib/database.types";
import { Button } from "../Atoms/Button";
import { DialogShell } from "../Molecules/DialogShell";
import { FormField } from "../Molecules/FormField";

const equipmentOptions: ExerciseEquipment[] = [
  "Barbell",
  "Dumbbell",
  "Bodyweight",
  "Cable",
  "Machine",
  "Kettlebell",
  "Resistance Band",
  "Other",
];

type AddExerciseDialogProps = {
  exercise?: ExerciseRecord;
  onClose: () => void;
  onSaved: (name: string, exerciseId: string, wasEdited: boolean) => void;
};

export function AddExerciseDialog({
  exercise,
  onClose,
  onSaved,
}: AddExerciseDialogProps) {
  const [name, setName] = useState(exercise?.name ?? "");
  const [equipment, setEquipment] = useState<ExerciseEquipment | "">(
    exercise?.equipment ?? "",
  );
  const [primaryMuscleGroupIds, setPrimaryMuscleGroupIds] = useState<string[]>(
    exercise?.primaryMuscleGroupIds ?? [],
  );
  const [secondaryMuscleGroupIds, setSecondaryMuscleGroupIds] = useState<
    string[]
  >(exercise?.secondaryMuscleGroupIds ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    data: muscleGroups,
    error: loadError,
    isLoading,
  } = useAsyncData(getMuscleGroups, [], {
    errorMessage: "Could not load muscle groups.",
    initialData: [] as MuscleGroup[],
  });

  function updateMuscleGroup(
    muscleGroupId: string,
    target: "primary" | "secondary",
    isSelected: boolean,
  ) {
    const setTargetIds =
      target === "primary"
        ? setPrimaryMuscleGroupIds
        : setSecondaryMuscleGroupIds;
    const setOtherIds =
      target === "primary"
        ? setSecondaryMuscleGroupIds
        : setPrimaryMuscleGroupIds;

    setTargetIds((currentIds) =>
      isSelected
        ? [...currentIds, muscleGroupId]
        : currentIds.filter((id) => id !== muscleGroupId),
    );

    if (isSelected) {
      setOtherIds((currentIds) =>
        currentIds.filter((id) => id !== muscleGroupId),
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Enter an exercise name.");
      return;
    }

    if (primaryMuscleGroupIds.length === 0) {
      setFormError("Choose at least one primary muscle group.");
      return;
    }

    if (!equipment) {
      setFormError("Choose an equipment type.");
      return;
    }

    setIsSaving(true);

    try {
      const exerciseInput = {
        name: name.trim(),
        equipment,
        primaryMuscleGroupIds,
        secondaryMuscleGroupIds,
      };

      const exerciseId = exercise
        ? await updateExercise(exercise.id, exerciseInput)
        : await createExercise(exerciseInput);

      onSaved(`${equipment} · ${name.trim()}`, exerciseId, Boolean(exercise));
      onClose();
    } catch (error: unknown) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Could not save this exercise.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function closeDialog() {
    if (!isSaving) onClose();
  }

  return (
    <DialogShell
      closeDisabled={isSaving}
      closeLabel="Close add exercise dialog"
      eyebrow="Shared exercise library"
      onClose={closeDialog}
      title={exercise ? "Edit Exercise" : "Add New Exercise"}
      titleId="add-exercise-heading"
      widthClass="max-w-2xl"
      className="p-5 sm:p-7"
    >
      <form onSubmit={handleSubmit}>
        <FormField label="Exercise name">
          <input
            autoFocus
            className="w-full rounded-md border border-border bg-void px-3.5 py-3 text-starlight outline-none transition placeholder:text-muted-steel/60 focus:border-secondary"
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Barbell squat"
            required
            value={name}
          />
        </FormField>

        <FormField className="mt-4" label="Equipment">
          <select
            className="w-full rounded-md border border-border bg-void px-3.5 py-3 text-starlight outline-none transition focus:border-secondary"
            onChange={(event) =>
              setEquipment(event.target.value as ExerciseEquipment | "")
            }
            required
            value={equipment}
          >
            <option value="" disabled>
              Select equipment
            </option>
            {equipmentOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>

        <div className="mt-6">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <h3 className="font-heading text-xl font-bold">Target muscles</h3>
              <p className="mt-0.5 text-xs text-muted-steel">
                Choose primary and secondary muscle groups.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center font-mono text-[9px] tracking-[0.08em] text-muted-steel uppercase">
              <span>Primary</span>
              <span>Secondary</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-36 items-center justify-center rounded-md border border-border bg-void/60">
              <Spinner compact label="Loading muscle groups..." />
            </div>
          ) : loadError ? (
            <p
              className="rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm"
              role="alert"
            >
              Could not load muscle groups: {loadError}
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-void/50">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-surface text-[10px] text-muted-steel uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium" scope="col">
                      Muscle group
                    </th>
                    <th
                      className="w-20 px-2 py-2 text-center font-medium"
                      scope="col"
                    >
                      Primary
                    </th>
                    <th
                      className="w-24 px-2 py-2 text-center font-medium"
                      scope="col"
                    >
                      Secondary
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {muscleGroups.map((muscleGroup) => (
                    <tr key={muscleGroup.id}>
                      <th
                        className="px-3 py-2.5 text-left font-medium"
                        scope="row"
                      >
                        {muscleGroup.name}
                      </th>
                      <td className="px-2 py-2.5 text-center">
                        <input
                          aria-label={`${muscleGroup.name} primary`}
                          checked={primaryMuscleGroupIds.includes(
                            muscleGroup.id,
                          )}
                          className="size-4 accent-secondary"
                          onChange={(event) =>
                            updateMuscleGroup(
                              muscleGroup.id,
                              "primary",
                              event.target.checked,
                            )
                          }
                          type="checkbox"
                        />
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <input
                          aria-label={`${muscleGroup.name} secondary`}
                          checked={secondaryMuscleGroupIds.includes(
                            muscleGroup.id,
                          )}
                          className="size-4 accent-secondary"
                          onChange={(event) =>
                            updateMuscleGroup(
                              muscleGroup.id,
                              "secondary",
                              event.target.checked,
                            )
                          }
                          type="checkbox"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {formError && (
          <p className="mt-3 text-sm text-danger" role="alert">
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
            disabled={
              isLoading ||
              Boolean(loadError) ||
              muscleGroups.length === 0 ||
              isSaving
            }
            type="submit"
          >
            {isSaving
              ? "Saving..."
              : exercise
                ? "Save Changes"
                : "Add Exercise"}
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
