import {
  coachOpenings,
  type ProgressCharacter,
} from "./character-copy";

type CoachSet = {
  setNumber: number;
  actualReps: number | null;
  actualWeight: number | null;
};

type RepRange = {
  min: number;
  max: number | null;
};

type CompletedCoachSet = CoachSet & {
  actualReps: number;
};

type WeightedCoachSet = CompletedCoachSet & {
  weight: number;
};

type OneRepMaxSet = {
  setNumber: number;
  actualReps: number;
  weight: number;
};

const DEFAULT_LOAD_INCREMENT_LB = 5;
const LOWER_BODY_LOAD_INCREMENT_LB = 10;
const LOWER_BODY_MUSCLE_GROUPS = new Set(["quads", "glutes", "hamstrings"]);

function getLoadIncrement(muscleGroups: readonly string[]): number {
  return muscleGroups.some((muscleGroup) =>
    LOWER_BODY_MUSCLE_GROUPS.has(muscleGroup.trim().toLowerCase()),
  )
    ? LOWER_BODY_LOAD_INCREMENT_LB
    : DEFAULT_LOAD_INCREMENT_LB;
}

export function getRandomCoachOpening(
  character: ProgressCharacter | null,
): string {
  const openings = character ? coachOpenings[character] : [];
  if (openings.length === 0) {
    return "Choose one target and make it count—here are some ways to progress.";
  }

  const randomIndex = Math.floor(Math.random() * openings.length);
  return openings[randomIndex] ?? openings[0];
}

function getUsableWeight(weight: number | null): number | null {
  return weight !== null && Number.isFinite(weight) && weight > 0
    ? weight
    : null;
}

function parseRepRange(target: string | null): RepRange | null {
  if (!target) return null;
  const values = target.match(/\d+/g)?.map(Number) ?? [];
  if (values.length === 0) return null;
  if (values.length === 1 && target.includes("+")) {
    return { min: values[0], max: null };
  }
  if (values.length === 1) return { min: values[0], max: values[0] };
  return { min: values[0], max: values.at(-1) ?? values[0] };
}

function getRepRangeForSet(
  targetReps: (string | null)[],
  setNumber: number,
): RepRange | null {
  return (
    parseRepRange(targetReps[setNumber - 1] ?? null) ??
    targetReps.map(parseRepRange).find((range) => range !== null) ??
    null
  );
}

function getRepsWithinRange(reps: number, range: RepRange | null): number {
  if (!range) return reps;
  return Math.max(
    range.min,
    range.max === null ? reps : Math.min(reps, range.max),
  );
}

function getNextRepTarget(
  set: CompletedCoachSet,
  targetReps: (string | null)[],
): { reps: number; range: RepRange | null } | null {
  const range = getRepRangeForSet(targetReps, set.setNumber);
  const reps = getRepsWithinRange(set.actualReps + 1, range);
  return reps > set.actualReps ? { reps, range } : null;
}

function getRepProgressionTarget(
  sets: WeightedCoachSet[],
  targetReps: (string | null)[],
): { set: WeightedCoachSet; reps: number; range: RepRange } | null {
  return (
    sets
      .flatMap((set) => {
        const range = getRepRangeForSet(targetReps, set.setNumber);
        if (!range || (range.max !== null && set.actualReps >= range.max)) {
          return [];
        }

        const reps = Math.max(range.min, set.actualReps + 1);
        if (range.max !== null && reps > range.max) return [];
        const rangeWidth = range.max === null ? 0 : range.max - range.min;
        const rangeProgress =
          rangeWidth > 0
            ? (set.actualReps - range.min) / rangeWidth
            : set.actualReps - range.min;
        return [{ set, reps, range, rangeProgress }];
      })
      .sort(
        (first, second) =>
          first.rangeProgress - second.rangeProgress ||
          first.set.setNumber - second.set.setNumber,
      )[0] ?? null
  );
}

function completedAllSetsAtRepRangeLimit(
  sets: CompletedCoachSet[],
  targetReps: (string | null)[],
): boolean {
  return (
    targetReps.length > 0 &&
    targetReps.every((_, index) => {
      const setNumber = index + 1;
      const maxReps = getRepRangeForSet(targetReps, setNumber)?.max;
      if (maxReps === null || maxReps === undefined) return false;

      return sets.some(
        (set) => set.setNumber === setNumber && set.actualReps >= maxReps,
      );
    })
  );
}

function formatRepRange(range: RepRange): string {
  if (range.max === null) return `${range.min}+`;
  if (range.min === range.max) return `${range.min}`;
  return `${range.min}–${range.max}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getEstimatedOneRepMaxTarget(
  bestSet: OneRepMaxSet,
  range: RepRange | null,
  loadIncrement: number,
): { weight: number; reps: number } {
  const targetReps =
    range?.max === null
      ? Math.max(bestSet.actualReps + 1, range.min)
      : range === null
        ? bestSet.actualReps + 1
        : bestSet.actualReps < range.max
          ? Math.max(bestSet.actualReps + 1, range.min)
          : range.max;

  if (targetReps > bestSet.actualReps) {
    return { weight: bestSet.weight, reps: targetReps };
  }

  const previousEstimate = bestSet.weight * (1 + bestSet.actualReps / 30);
  const weightForImprovement = previousEstimate / (1 + targetReps / 30);
  const increments = Math.max(
    1,
    Math.floor((weightForImprovement - bestSet.weight) / loadIncrement) + 1,
  );
  return {
    weight: bestSet.weight + increments * loadIncrement,
    reps: targetReps,
  };
}

export function getNextEstimatedOneRepMaxTarget(
  bestSet: OneRepMaxSet,
  targetReps: (string | null)[],
  muscleGroups: readonly string[],
): { weight: number; reps: number } {
  return getEstimatedOneRepMaxTarget(
    bestSet,
    getRepRangeForSet(targetReps, bestSet.setNumber),
    getLoadIncrement(muscleGroups),
  );
}

function getBodyweightSuggestions(
  completedSets: CompletedCoachSet[],
  targetReps: (string | null)[],
) {
  const bestRepSet = completedSets.reduce<CompletedCoachSet | null>(
    (best, set) =>
      best === null || set.actualReps > best.actualReps ? set : best,
    null,
  );
  const setWithRepRoom = completedSets
    .map((set) => ({ set, target: getNextRepTarget(set, targetReps) }))
    .filter(
      (
        item,
      ): item is {
        set: CompletedCoachSet;
        target: { reps: number; range: RepRange | null };
      } => item.target !== null,
    )
    .reduce<(typeof completedSets)[number] | null>(
      (best, item) =>
        best === null || item.set.actualReps < best.actualReps
          ? item.set
          : best,
      null,
    );
  const totalReps = completedSets.reduce(
    (total, set) => total + set.actualReps,
    0,
  );
  const bestRepTarget =
    bestRepSet === null ? null : getNextRepTarget(bestRepSet, targetReps);
  const totalRepTarget =
    setWithRepRoom === null
      ? null
      : getNextRepTarget(setWithRepRoom, targetReps);

  return [
    {
      label: "Best-set reps",
      description:
        bestRepSet === null
          ? "Log reps in a completed session to establish a numeric baseline."
          : bestRepTarget === null
            ? `Last best: ${bestRepSet.actualReps} reps. This set is already at the top of its rep range; use a harder variation to progress.`
            : `Last best: ${bestRepSet.actualReps} reps. Target: ${bestRepTarget.reps} reps on Set ${bestRepSet.setNumber}${bestRepTarget.range ? ` (within the ${formatRepRange(bestRepTarget.range)} rep range)` : ""}.`,
    },
    {
      label: "Total reps",
      description:
        completedSets.length === 0
          ? "Log reps across a completed session to calculate a numeric target."
          : totalRepTarget === null || setWithRepRoom === null
            ? `Last total: ${totalReps} reps. All logged sets are at their rep-range limits; use a harder variation or adjust the set plan.`
            : `Last total: ${totalReps} reps. Target: ${totalReps + totalRepTarget.reps - setWithRepRoom.actualReps} reps by taking Set ${setWithRepRoom.setNumber} from ${setWithRepRoom.actualReps} to ${totalRepTarget.reps}.`,
    },
    {
      label: "Heaviest load",
      description:
        "No external load is logged, so this option is not applicable. Progress with reps or a harder variation instead.",
    },
  ];
}

export function getCoachSuggestions(
  character: ProgressCharacter | null,
  previousSets: CoachSet[],
  targetReps: (string | null)[],
  opening = getRandomCoachOpening(character),
  muscleGroups: readonly string[] = [],
) {
  const completedSets = previousSets.filter(
    (set): set is CompletedCoachSet =>
      set.actualReps !== null && set.actualReps > 0,
  );
  const weightedSets = completedSets.flatMap((set) => {
    const weight = getUsableWeight(set.actualWeight);
    return weight === null ? [] : [{ ...set, weight }];
  });
  if (weightedSets.length === 0) {
    return {
      opening,
      suggestions: getBodyweightSuggestions(completedSets, targetReps),
    };
  }
  const loadIncrement = getLoadIncrement(muscleGroups);

  const heaviestSet = weightedSets.reduce<WeightedCoachSet | null>(
    (heaviest, set) =>
      heaviest === null || set.weight > heaviest.weight ? set : heaviest,
    null,
  );
  const repProgressionTarget = getRepProgressionTarget(
    weightedSets,
    targetReps,
  );
  const heaviestLoadRange =
    heaviestSet === null
      ? null
      : getRepRangeForSet(targetReps, heaviestSet.setNumber);
  const heaviestLoadTarget =
    heaviestSet === null
      ? null
      : {
          weight: heaviestSet.weight + loadIncrement,
          reps: heaviestLoadRange?.min ?? heaviestSet.actualReps,
        };
  const allSetsAtRepRangeLimit = completedAllSetsAtRepRangeLimit(
    completedSets,
    targetReps,
  );
  const heaviestLoadSuggestion = {
    label: allSetsAtRepRangeLimit ? "Increase weight" : "Heaviest load",
    description:
      heaviestSet === null || heaviestLoadTarget === null
        ? "Log a weighted set to establish a numeric baseline."
        : `${allSetsAtRepRangeLimit ? "You completed every prescribed set at the top of its rep range. " : ""}Your heaviest set last time was ${formatNumber(heaviestSet.weight)} lb for ${heaviestSet.actualReps} reps. Try increasing it to ${formatNumber(heaviestLoadTarget.weight)} lb for at least ${heaviestLoadTarget.reps} reps${heaviestLoadRange ? ` (within the ${formatRepRange(heaviestLoadRange)} rep range)` : ""}.`,
  };

  return {
    opening,
    suggestions: [
      ...(allSetsAtRepRangeLimit ? [heaviestLoadSuggestion] : []),
      ...(repProgressionTarget
        ? [
            {
              label: "Add reps",
              description: `Aim to increase Set ${repProgressionTarget.set.setNumber} from ${repProgressionTarget.set.actualReps} to ${repProgressionTarget.reps} reps at ${formatNumber(repProgressionTarget.set.weight)} lb (within the ${formatRepRange(repProgressionTarget.range)} rep range).`,
            },
          ]
        : []),
      ...(!allSetsAtRepRangeLimit ? [heaviestLoadSuggestion] : []),
    ],
  };
}
