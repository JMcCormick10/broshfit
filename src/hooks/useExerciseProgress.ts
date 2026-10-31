import { useMemo, useState } from "react";
import { useAsyncData } from "./useAsyncData";
import { getExerciseProgress, type ExerciseProgressEntry } from "../lib/workouts";

export type ProgressRange = "month" | "3months" | "6months" | "year" | "all";

const RANGE_MONTHS: Record<Exclude<ProgressRange, "all">, number> = {
  month: 1,
  "3months": 3,
  "6months": 6,
  year: 12,
};

export function useExerciseProgress(exerciseId?: string) {
  const [range, setRange] = useState<ProgressRange>("3months");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const { data, error, isLoading } = useAsyncData(
    () => getExerciseProgress(exerciseId),
    [exerciseId],
    {
      errorMessage: "Could not load exercise progress.",
      initialData: [] as ExerciseProgressEntry[],
    },
  );

  const exercises = useMemo(() => {
    const grouped = new Map<string, ExerciseProgressEntry[]>();
    for (const entry of data) {
      const entries = grouped.get(entry.exerciseId) ?? [];
      entries.push(entry);
      grouped.set(entry.exerciseId, entries);
    }
    return [...grouped.entries()]
      .map(([id, entries]) => ({ id, name: entries[0].exerciseName, equipment: entries[0].equipment, entries }))
      .sort((a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name));
  }, [data]);

  const selectedExercise = exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null;
  const cutoff = range === "all" ? null : new Date(Date.now() - RANGE_MONTHS[range] * 30.4375 * 24 * 60 * 60 * 1000);
  const filteredEntries = (selectedExercise?.entries ?? []).filter((entry) => !cutoff || new Date(entry.completedAt) >= cutoff);
  const recentCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const recentEntries = data.filter((entry) => new Date(entry.completedAt) >= recentCutoff);
  const getEntriesInRange = (entries: ExerciseProgressEntry[]) =>
    entries.filter((entry) => !cutoff || new Date(entry.completedAt) >= cutoff);

  return {
    data, error, isLoading, exercises, range, setRange, selectedExercise,
    selectedExerciseId, setSelectedExerciseId, filteredEntries, recentEntries, getEntriesInRange,
  };
}
