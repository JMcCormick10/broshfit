import { useEffect, useState } from "react";
import {
  getExerciseHistory,
  type ExerciseHistory,
  type ExerciseHistorySet,
} from "../lib/workouts";

export function useExerciseHistory(
  exerciseId: string | null,
  sessionId: string,
  currentCompletedExerciseIds: string[],
) {
  const [history, setHistory] = useState<ExerciseHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completedKey = currentCompletedExerciseIds.join(",");

  useEffect(() => {
    if (!exerciseId) {
      // oxlint-disable-next-line react/set-state-in-effect -- clear history when no exercise is selected
      setHistory(null);
      // oxlint-disable-next-line react/set-state-in-effect -- clear error when no exercise is selected
      setError(null);
      // oxlint-disable-next-line react/set-state-in-effect -- clear loading state when no exercise is selected
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    // oxlint-disable-next-line react/set-state-in-effect -- show loading state while fetching history
    setIsLoading(true);
    // oxlint-disable-next-line react/set-state-in-effect -- clear stale error before fetching history
    setError(null);

    getExerciseHistory(exerciseId, sessionId, currentCompletedExerciseIds)
      .then((result) => {
        if (isMounted) setHistory(result);
      })
      .catch((historyError: unknown) => {
        if (isMounted) {
          setHistory(null);
          setError(
            historyError instanceof Error
              ? historyError.message
              : "Could not load exercise history.",
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- completedKey summarizes the id list
  }, [exerciseId, sessionId, completedKey]);

  return { history, isLoading, error };
}

export function formatExerciseHistorySets(sets: ExerciseHistorySet[]): string {
  const completedSets = sets.filter((set) => set.actualReps !== null);
  if (completedSets.length === 0) return "No reps were recorded.";

  const first = completedSets[0];
  const isUniform = completedSets.every(
    (set) =>
      set.actualReps === first.actualReps &&
      set.actualWeight === first.actualWeight,
  );

  if (isUniform) {
    const weight =
      first.actualWeight !== null ? ` at ${first.actualWeight} lb` : "";
    return `${completedSets.length} set${completedSets.length === 1 ? "" : "s"} of ${first.actualReps} reps${weight}`;
  }

  return completedSets
    .map(
      (set) =>
        `${set.actualReps} reps${set.actualWeight !== null ? ` at ${set.actualWeight} lb` : ""}`,
    )
    .join(" · ");
}
