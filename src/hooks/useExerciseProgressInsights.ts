import { useMemo } from "react";
import type { ExerciseProgressEntry } from "../lib/workouts";
import type { ProgressRange } from "./useExerciseProgress";

export type ProgressTrend = "up" | "down" | "steady" | "unknown";

export function estimateOneRepMax(weight: string | null, reps: number | null): number | null {
  if (!weight || !reps || reps <= 0) return null;
  const numericWeight = Number.parseFloat(weight.replace(/,/g, ""));
  if (!Number.isFinite(numericWeight) || numericWeight <= 0) return null;
  return numericWeight * (1 + reps / 30);
}

export function getBestEstimatedOneRepMax(entries: ExerciseProgressEntry[]): number | null {
  return entries.flatMap((entry) => entry.sets.map((set) => estimateOneRepMax(set.actualWeight, set.actualReps)))
    .filter((value): value is number => value !== null)
    .reduce<number | null>((best, value) => best === null || value > best ? value : best, null);
}

function getOrderedSessionEstimates(entries: ExerciseProgressEntry[]) {
  return entries.map((entry) => ({ entry, estimate: getBestEstimatedOneRepMax([entry]) }))
    .filter((point): point is { entry: ExerciseProgressEntry; estimate: number } => point.estimate !== null)
    .sort((a, b) => new Date(a.entry.completedAt).getTime() - new Date(b.entry.completedAt).getTime());
}

function getTrend(change: number | null): ProgressTrend {
  if (change === null) return "unknown";
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "steady";
}

function getStableVariant(value: string, seed: number, count: number): number {
  return [...value].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, seed) % count;
}

export function useExerciseProgressInsights({
  exercises,
  getEntriesInRange,
  range,
  selectedExerciseId,
}: {
  exercises: { id: string; name: string; equipment: string; entries: ExerciseProgressEntry[] }[];
  getEntriesInRange: (entries: ExerciseProgressEntry[]) => ExerciseProgressEntry[];
  range: ProgressRange;
  selectedExerciseId: string | null;
}) {
  return useMemo(() => {
    const overviewStats = exercises.map((exercise) => {
      const rangeEntries = getEntriesInRange(exercise.entries);
      const estimates = getOrderedSessionEstimates(rangeEntries);
      const first = estimates[0]?.estimate;
      const latest = estimates.at(-1)?.estimate;
      return {
        id: exercise.id,
        name: exercise.name,
        equipment: exercise.equipment,
        sessions: rangeEntries.length,
        percentChange: first !== undefined && latest !== undefined && first > 0 ? (latest - first) / first * 100 : null,
      };
    });
    const comparable = overviewStats.filter((item) => item.percentChange !== null);
    const exerciseBreakdown = {
      improved: comparable.filter((item) => item.percentChange! > 0.5).length,
      declined: comparable.filter((item) => item.percentChange! < -0.5).length,
      steady: comparable.filter((item) => Math.abs(item.percentChange!) <= 0.5).length,
      insufficient: overviewStats.length - comparable.length,
      total: overviewStats.length,
    };
    const overallChange = comparable.length
      ? comparable.reduce((total, item) => total + item.percentChange!, 0) / comparable.length
      : null;
    const overallTrend = getTrend(overallChange !== null && Math.abs(overallChange) <= 0.5 ? 0 : overallChange);
    const selected = exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null;
    const selectedEntries = selected ? getEntriesInRange(selected.entries) : [];
    const selectedEstimates = getOrderedSessionEstimates(selectedEntries);
    const firstEstimate = selectedEstimates[0]?.estimate ?? null;
    const latestEstimate = selectedEstimates.at(-1)?.estimate ?? null;
    const change = firstEstimate !== null && latestEstimate !== null ? latestEstimate - firstEstimate : null;
    const percentChange = firstEstimate !== null && latestEstimate !== null && firstEstimate > 0
      ? (latestEstimate - firstEstimate) / firstEstimate * 100
      : null;
    return {
      overviewStats,
      bestProgress: comparable.reduce<(typeof overviewStats)[number] | null>((best, item) => best === null || item.percentChange! > best.percentChange! ? item : best, null),
      worstProgress: comparable.reduce<(typeof overviewStats)[number] | null>((worst, item) => worst === null || item.percentChange! < worst.percentChange! ? item : worst, null),
      overallTrend,
      exerciseBreakdown,
      overviewVariant: getStableVariant(range, 13, 50),
      selected,
      selectedEntries,
      rangeBest: getBestEstimatedOneRepMax(selectedEntries),
      change,
      trend: getTrend(change),
      percentChange,
      detailVariant: selected ? getStableVariant(`${selected.id}:${range}`, 7, 50) : 0,
    };
  }, [exercises, getEntriesInRange, range, selectedExerciseId]);
}
