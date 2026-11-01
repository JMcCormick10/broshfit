import { useMemo } from "react";
import type { ExerciseProgressEntry } from "../lib/workouts";
import type { ProgressRange } from "./useExerciseProgress";

export type ProgressTrend = "up" | "down" | "steady" | "mixed" | "unknown";
export const PROGRESS_POSITIVE_THRESHOLD_PERCENT = 0.1;
export const PROGRESS_DECLINE_THRESHOLD_PERCENT = 2;

export function estimateOneRepMax(
  weight: number | null,
  reps: number | null,
): number | null {
  if (
    weight === null ||
    !Number.isFinite(weight) ||
    weight <= 0 ||
    !reps ||
    reps <= 0
  ) {
    return null;
  }
  // Epley's formula estimates a one-rep max as load * (1 + reps / 30).
  // It is a comparison estimate, not a substitute for a tested one-rep max.
  return weight * (1 + reps / 30);
}

export function getBestEstimatedOneRepMax(
  entries: ExerciseProgressEntry[],
): number | null {
  // Estimate each valid set and select the maximum. Session metrics call this
  // with one entry; range summaries therefore use the best set in that range.
  return entries.flatMap((entry) => entry.sets.map((set) => estimateOneRepMax(set.actualWeight, set.actualReps)))
    .filter((value): value is number => value !== null)
    .reduce<number | null>((best, value) => best === null || value > best ? value : best, null);
}

export type ExerciseSessionMetrics = {
  entry: ExerciseProgressEntry;
  bestEstimatedOneRepMax: number | null;
  bestSetReps: number | null;
  heaviestLoad: number | null;
  totalReps: number | null;
};

function getUsableWeight(weight: number | null): number | null {
  return weight !== null && Number.isFinite(weight) && weight > 0
    ? weight
    : null;
}

function hasLoggedLoad(entries: ExerciseProgressEntry[]): boolean {
  return entries.some((entry) =>
    entry.sets.some((set) => getUsableWeight(set.actualWeight) !== null),
  );
}

export function getBestSetReps(entry: ExerciseProgressEntry): number | null {
  return entry.sets.reduce<number | null>((best, set) => {
    if (set.actualReps === null || set.actualReps < 0) return best;
    return best === null || set.actualReps > best ? set.actualReps : best;
  }, null);
}

export function getExerciseSessionMetrics(
  entry: ExerciseProgressEntry,
): ExerciseSessionMetrics {
  const loggedSets = entry.sets.filter(
    (set) => set.actualReps !== null && set.actualReps >= 0,
  );
  const validLoads = loggedSets
    .map((set) => getUsableWeight(set.actualWeight))
    .filter((weight): weight is number => weight !== null);

  return {
    entry,
    bestEstimatedOneRepMax: getBestEstimatedOneRepMax([entry]),
    bestSetReps: getBestSetReps(entry),
    heaviestLoad:
      validLoads.length > 0 ? Math.max(...validLoads) : null,
    totalReps:
      loggedSets.length > 0
        // Sum completed-set reps independently of whether loads were logged.
        ? loggedSets.reduce((total, set) => total + set.actualReps!, 0)
        : null,
  };
}

function getOrderedSessionMetrics(entries: ExerciseProgressEntry[]) {
  return entries
    .map(getExerciseSessionMetrics)
    .sort(
      (a, b) =>
        new Date(a.entry.completedAt).getTime() -
        new Date(b.entry.completedAt).getTime(),
    );
}

function getMetricEndpoints<T>(
  metrics: ExerciseSessionMetrics[],
  getValue: (metrics: ExerciseSessionMetrics) => T | null,
) {
  const points = metrics
    .map((metric) => ({ metric, value: getValue(metric) }))
    .filter((point): point is { metric: ExerciseSessionMetrics; value: T } =>
      point.value !== null,
    );

  // Compare the first and last sessions that actually have this metric.
  return points.length >= 2
    ? { first: points[0].value, latest: points.at(-1)!.value }
    : null;
}

function getPercentChange(first: number | null, latest: number | null) {
  // Relative change = ((latest - first) / first) * 100. A non-positive
  // baseline cannot be used as a meaningful percentage denominator.
  return first !== null && latest !== null && first > 0
    ? ((latest - first) / first) * 100
    : null;
}

export function getPercentChangeTrend(
  percentChange: number | null,
): ProgressTrend {
  if (percentChange === null) return "unknown";
  if (percentChange >= PROGRESS_POSITIVE_THRESHOLD_PERCENT) return "up";
  if (percentChange < -PROGRESS_DECLINE_THRESHOLD_PERCENT) return "down";
  // Small gains below 0.1% and declines of up to 2% are treated as steady.
  return "steady";
}

function getCombinedTrend(
  strengthChange: number | null,
  loadChange: number | null,
  totalRepsChange: number | null,
  bestSetRepsChange: number | null,
  usesRepMetrics: boolean,
): ProgressTrend {
  return getTrendFromChanges(
    usesRepMetrics
      ? [totalRepsChange, bestSetRepsChange]
      : [strengthChange, loadChange],
  );
}

function getTrendFromChanges(changes: (number | null)[]): ProgressTrend {
  const availableTrends = changes
    .map(getPercentChangeTrend)
    .filter((trend) => trend !== "unknown");
  if (availableTrends.length === 0) return "unknown";

  const isUp = availableTrends.includes("up");
  const isDown = availableTrends.includes("down");
  // Conflicting weighted signals stay mixed instead of masking a tradeoff.
  if (isUp && isDown) return "mixed";
  if (isUp) return "up";
  if (isDown) return "down";
  return "steady";
}

function getAverageChange(values: (number | null)[]) {
  const availableValues = values.filter(
    (value): value is number => value !== null,
  );
  return availableValues.length > 0
    ? availableValues.reduce((total, value) => total + value, 0) /
        availableValues.length
    : null;
}

function getProgressScore(
  strengthChange: number | null,
  loadChange: number | null,
  totalRepsChange: number | null,
  bestSetRepsChange: number | null,
  usesRepMetrics: boolean,
) {
  // This average ranks exercises already classified as up/down; it does not
  // determine the trend, which is based on each measure's direction.
  return getAverageChange(
    usesRepMetrics
      ? [totalRepsChange, bestSetRepsChange]
      : [strengthChange, loadChange],
  );
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
      const metrics = getOrderedSessionMetrics(rangeEntries);
      const strengthEndpoints = getMetricEndpoints(
        metrics,
        (metric) => metric.bestEstimatedOneRepMax,
      );
      const loadEndpoints = getMetricEndpoints(
        metrics,
        (metric) => metric.heaviestLoad,
      );
      const repEndpoints = getMetricEndpoints(
        metrics,
        (metric) => metric.totalReps,
      );
      const bestSetEndpoints = getMetricEndpoints(
        metrics,
        (metric) => metric.bestSetReps,
      );
      const usesRepMetrics = !hasLoggedLoad(exercise.entries);
      const strengthPercentChange = getPercentChange(
        strengthEndpoints?.first ?? null,
        strengthEndpoints?.latest ?? null,
      );
      const heaviestLoadPercentChange = getPercentChange(
        loadEndpoints?.first ?? null,
        loadEndpoints?.latest ?? null,
      );
      const totalRepsChange =
        repEndpoints === null
          ? null
          : repEndpoints.latest - repEndpoints.first;
      const totalRepsPercentChange = getPercentChange(
        repEndpoints?.first ?? null,
        repEndpoints?.latest ?? null,
      );
      const bestSetRepsChange =
        bestSetEndpoints === null
          ? null
          : bestSetEndpoints.latest - bestSetEndpoints.first;
      const bestSetRepsPercentChange = getPercentChange(
        bestSetEndpoints?.first ?? null,
        bestSetEndpoints?.latest ?? null,
      );
      const repPerformancePercentChange = getAverageChange([
        totalRepsPercentChange,
        bestSetRepsPercentChange,
      ]);
      const trend = getCombinedTrend(
        strengthPercentChange,
        heaviestLoadPercentChange,
        totalRepsPercentChange,
        bestSetRepsPercentChange,
        usesRepMetrics,
      );
      return {
        id: exercise.id,
        name: exercise.name,
        equipment: exercise.equipment,
        sessions: rangeEntries.length,
        usesRepMetrics,
        strengthPercentChange,
        heaviestLoadPercentChange,
        totalRepsChange,
        totalRepsPercentChange,
        bestSetRepsChange,
        bestSetRepsPercentChange,
        repPerformancePercentChange,
        trend,
        progressScore: getProgressScore(
          strengthPercentChange,
          heaviestLoadPercentChange,
          totalRepsPercentChange,
          bestSetRepsPercentChange,
          usesRepMetrics,
        ),
      };
    });
    const comparable = overviewStats.filter(
      (item) => item.trend !== "unknown",
    );
    const exerciseBreakdown = {
      improved: comparable.filter((item) => item.trend === "up").length,
      declined: comparable.filter((item) => item.trend === "down").length,
      steady: comparable.filter((item) => item.trend === "steady").length,
      mixed: comparable.filter((item) => item.trend === "mixed").length,
      insufficient: overviewStats.filter((item) => item.trend === "unknown")
        .length,
      total: overviewStats.length,
    };
    const weightedStats = overviewStats.filter((item) => !item.usesRepMetrics);
    const repStats = overviewStats.filter((item) => item.usesRepMetrics);
    const overallTrend = getTrendFromChanges([
      getAverageChange(
        weightedStats.map((item) => item.strengthPercentChange),
      ),
      getAverageChange(
        weightedStats.map((item) => item.heaviestLoadPercentChange),
      ),
      getAverageChange(repStats.map((item) => item.totalRepsPercentChange)),
      getAverageChange(repStats.map((item) => item.bestSetRepsPercentChange)),
    ]);
    const selected = exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null;
    const selectedEntries = selected ? getEntriesInRange(selected.entries) : [];
    const selectedMetrics = getOrderedSessionMetrics(selectedEntries);
    const strengthEndpoints = getMetricEndpoints(
      selectedMetrics,
      (metric) => metric.bestEstimatedOneRepMax,
    );
    const repEndpoints = getMetricEndpoints(
      selectedMetrics,
      (metric) => metric.totalReps,
    );
    const bestSetEndpoints = getMetricEndpoints(
      selectedMetrics,
      (metric) => metric.bestSetReps,
    );
    const loadEndpoints = getMetricEndpoints(
      selectedMetrics,
      (metric) => metric.heaviestLoad,
    );
    const usesRepMetrics = selected
      ? !hasLoggedLoad(selected.entries)
      : false;
    const totalRepsChange =
      repEndpoints === null
        ? null
        : repEndpoints.latest - repEndpoints.first;
    const totalRepsPercentChange = getPercentChange(
      repEndpoints?.first ?? null,
      repEndpoints?.latest ?? null,
    );
    const bestSetRepsChange =
      bestSetEndpoints === null
        ? null
        : bestSetEndpoints.latest - bestSetEndpoints.first;
    const bestSetRepsPercentChange = getPercentChange(
      bestSetEndpoints?.first ?? null,
      bestSetEndpoints?.latest ?? null,
    );
    const percentChange = getPercentChange(
      strengthEndpoints?.first ?? null,
      strengthEndpoints?.latest ?? null,
    );
    const repPerformancePercentChange = getAverageChange([
      totalRepsPercentChange,
      bestSetRepsPercentChange,
    ]);
    const heaviestLoadPercentChange = getPercentChange(
      loadEndpoints?.first ?? null,
      loadEndpoints?.latest ?? null,
    );
    const heaviestLoadChange =
      loadEndpoints === null
        ? null
        : loadEndpoints.latest - loadEndpoints.first;
    return {
      overviewStats,
      bestProgress: comparable
        .filter((item) => item.trend === "up")
        .reduce<(typeof overviewStats)[number] | null>(
          (best, item) =>
            best === null || item.progressScore! > best.progressScore!
              ? item
              : best,
          null,
        ),
      worstProgress: comparable
        .filter((item) => item.trend === "down")
        .reduce<(typeof overviewStats)[number] | null>(
          (worst, item) =>
            worst === null || item.progressScore! < worst.progressScore!
              ? item
              : worst,
          null,
        ),
      overallTrend,
      exerciseBreakdown,
      overviewVariant: getStableVariant(range, 13, 50),
      selected,
      selectedEntries,
      usesRepMetrics,
      rangeBest: getBestEstimatedOneRepMax(selectedEntries),
      totalRepsChange,
      totalRepsPercentChange,
      bestSetRepsChange,
      bestSetRepsPercentChange,
      repPerformancePercentChange,
      heaviestLoadChange,
      heaviestLoadPercentChange,
      progressMetricLabel: usesRepMetrics
        ? "Rep performance"
        : "Estimated 1RM",
      percentChange: usesRepMetrics
        ? repPerformancePercentChange
        : percentChange,
      trend: getCombinedTrend(
        percentChange,
        heaviestLoadPercentChange,
        totalRepsPercentChange,
        bestSetRepsPercentChange,
        usesRepMetrics,
      ),
      detailVariant: selected ? getStableVariant(`${selected.id}:${range}`, 7, 50) : 0,
    };
  }, [exercises, getEntriesInRange, range, selectedExerciseId]);
}
