import { useDeferredValue, useState } from "react";
import { Spinner } from "../Atoms/Spinner";
import { Button } from "../Atoms/Button";
import { FormField } from "../Molecules/FormField";
import { getExercises, type ExerciseRecord } from "../../lib/exercises";
import { useAsyncData } from "../../hooks/useAsyncData";

type ExerciseLibraryProps = {
  onAdd: () => void;
  onEdit: (exercise: ExerciseRecord) => void;
  refreshKey: number;
};

export function ExerciseLibrary({
  onAdd,
  onEdit,
  refreshKey,
}: ExerciseLibraryProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const {
    data: exercises,
    error: loadError,
    isLoading,
  } = useAsyncData(getExercises, [refreshKey], {
    errorMessage: "Could not load exercises.",
    initialData: [] as ExerciseRecord[],
  });

  const visibleExercises = exercises.filter((exercise) =>
    [
      exercise.name,
      exercise.equipment,
      ...exercise.primaryMuscleGroups,
      ...exercise.secondaryMuscleGroups,
    ]
      .join(" ")
      .toLowerCase()
      .includes(deferredSearch),
  );

  return (
    <section aria-labelledby="exercise-library-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="mb-2 font-mono text-[10px] font-bold tracking-[0.2em] text-accent uppercase">
            Shared movement catalog
          </p>
          <h1
            id="exercise-library-heading"
            className="font-heading text-4xl leading-none font-bold sm:text-5xl"
          >
            Exercises
          </h1>
        </div>
        <Button variant="primary" onClick={onAdd} type="button">
          Add Exercise
        </Button>
      </div>

      <FormField className="mt-5 max-w-md" label="Find an exercise">
        <input
          className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-starlight outline-none transition placeholder:text-muted-steel/60 focus:border-secondary"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, equipment, or muscle group"
          type="search"
          value={search}
        />
      </FormField>

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Spinner label="Loading exercises..." />
        </div>
      ) : loadError ? (
        <p
          className="mt-6 rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm"
          role="alert"
        >
          Could not load exercises: {loadError}
        </p>
      ) : visibleExercises.length === 0 ? (
        <p className="mt-6 border-y border-border py-8 text-sm text-muted-steel">
          {exercises.length === 0
            ? "No exercises have been added yet."
            : "No exercises match that search."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto border-y border-border">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead className="text-left font-mono text-[10px] tracking-[0.1em] text-muted-steel uppercase">
              <tr className="border-b border-border">
                <th className="py-3 pr-4 font-medium" scope="col">
                  Exercise
                </th>
                <th className="py-3 pr-4 font-medium" scope="col">
                  Primary
                </th>
                <th className="py-3 pr-4 font-medium" scope="col">
                  Secondary
                </th>
                <th className="py-3 pr-4 font-medium" scope="col">
                  Equipment
                </th>
                <th className="py-3 text-right font-medium" scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {visibleExercises.map((exercise) => (
                <tr key={exercise.id}>
                  <th className="py-3 pr-4 text-left font-semibold" scope="row">
                    {exercise.name}
                  </th>
                  <td className="py-3 pr-4 text-muted-steel">
                    {exercise.primaryMuscleGroups.join(", ")}
                  </td>
                  <td className="py-3 pr-4 text-muted-steel">
                    {exercise.secondaryMuscleGroups.join(", ") || "-"}
                  </td>
                  <td className="py-3 pr-4 text-secondary">
                    {exercise.equipment}
                  </td>
                  <td className="py-3 text-right">
                    <Button
                      variant="outline-small"
                      aria-label={`Edit ${exercise.name}`}
                      onClick={() => onEdit(exercise)}
                      type="button"
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
