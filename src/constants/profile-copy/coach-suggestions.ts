import { coachOpenings, getCharacterForProfileName } from "./character-copy";

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

const HEAVIEST_LOAD_INCREMENT_LB = 5;

export function getRandomCoachOpening(profileName: string): string {
  const character = getCharacterForProfileName(profileName);
  const openings = character ? coachOpenings[character] : [];
  if (openings.length === 0) {
    return "Choose one target and make it count—here are three ways to progress.";
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
  bestSet: WeightedCoachSet,
  range: RepRange | null,
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
    Math.floor(
      (weightForImprovement - bestSet.weight) / HEAVIEST_LOAD_INCREMENT_LB,
    ) + 1,
  );
  return {
    weight: bestSet.weight + increments * HEAVIEST_LOAD_INCREMENT_LB,
    reps: targetReps,
  };
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

function getVolumeLoadTarget(
  weightedSets: WeightedCoachSet[],
  volumeLoad: number,
  targetReps: (string | null)[],
): {
  setNumber: number;
  weight: number;
  reps: number;
  volumeLoad: number;
} | null {
  const setsWithRepRoom = weightedSets.filter((set) => {
    const range = getRepRangeForSet(targetReps, set.setNumber);
    return range?.max === null || range === null || set.actualReps < range.max;
  });
  const setToProgress = setsWithRepRoom.reduce<WeightedCoachSet | null>(
    (best, set) => (best === null || set.weight > best.weight ? set : best),
    null,
  );

  if (setToProgress) {
    const range = getRepRangeForSet(targetReps, setToProgress.setNumber);
    const reps = getRepsWithinRange(setToProgress.actualReps + 1, range);
    return {
      setNumber: setToProgress.setNumber,
      weight: setToProgress.weight,
      reps,
      volumeLoad:
        volumeLoad + (reps - setToProgress.actualReps) * setToProgress.weight,
    };
  }

  const heaviestSet = weightedSets.reduce<WeightedCoachSet | null>(
    (best, set) => (best === null || set.weight > best.weight ? set : best),
    null,
  );
  if (!heaviestSet) return null;

  const range = getRepRangeForSet(targetReps, heaviestSet.setNumber);
  const reps = getRepsWithinRange(heaviestSet.actualReps, range);
  const currentSetVolume = heaviestSet.weight * heaviestSet.actualReps;
  const requiredLoadForMoreVolume = currentSetVolume / reps;
  const increments = Math.max(
    1,
    Math.floor(
      (requiredLoadForMoreVolume - heaviestSet.weight) /
        HEAVIEST_LOAD_INCREMENT_LB,
    ) + 1,
  );
  const weight = heaviestSet.weight + increments * HEAVIEST_LOAD_INCREMENT_LB;

  return {
    setNumber: heaviestSet.setNumber,
    weight,
    reps,
    volumeLoad: volumeLoad - currentSetVolume + weight * reps,
  };
}

export function getCoachSuggestions(
  profileName: string,
  previousSets: CoachSet[],
  targetReps: (string | null)[],
  opening = getRandomCoachOpening(profileName),
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

  // Epley's formula ranks the prior sets; targets stay inside the planned rep
  // range and use load increases when there is no room to add another rep.
  const bestEstimatedSet = weightedSets.reduce<WeightedCoachSet | null>(
    (best, set) => {
      const estimate = set.weight * (1 + set.actualReps / 30);
      const bestEstimate =
        best === null ? null : best.weight * (1 + best.actualReps / 30);
      return bestEstimate === null || estimate > bestEstimate ? set : best;
    },
    null,
  );
  const heaviestSet = weightedSets.reduce<WeightedCoachSet | null>(
    (heaviest, set) =>
      heaviest === null || set.weight > heaviest.weight ? set : heaviest,
    null,
  );
  const volumeLoad =
    completedSets.length > 0 && weightedSets.length === completedSets.length
      ? weightedSets.reduce(
          (total, set) => total + set.weight * set.actualReps,
          0,
        )
      : null;
  const estimatedOneRepMaxTarget =
    bestEstimatedSet === null
      ? null
      : getEstimatedOneRepMaxTarget(
          bestEstimatedSet,
          getRepRangeForSet(targetReps, bestEstimatedSet.setNumber),
        );
  const volumeLoadTarget =
    volumeLoad === null
      ? null
      : getVolumeLoadTarget(weightedSets, volumeLoad, targetReps);
  const estimatedOneRepMaxRange =
    bestEstimatedSet === null
      ? null
      : getRepRangeForSet(targetReps, bestEstimatedSet.setNumber);
  const volumeLoadRange =
    volumeLoadTarget === null
      ? null
      : getRepRangeForSet(targetReps, volumeLoadTarget.setNumber);
  const heaviestLoadRange =
    heaviestSet === null
      ? null
      : getRepRangeForSet(targetReps, heaviestSet.setNumber);
  const heaviestLoadTarget =
    heaviestSet === null
      ? null
      : {
          weight: heaviestSet.weight + HEAVIEST_LOAD_INCREMENT_LB,
          reps: heaviestLoadRange?.min ?? heaviestSet.actualReps,
        };

  return {
    opening,
    suggestions: [
      {
        label: "Estimated 1RM",
        description:
          bestEstimatedSet === null || estimatedOneRepMaxTarget === null
            ? "Log a weighted set with reps to establish a numeric baseline."
            : `Last best: ${formatNumber(bestEstimatedSet.weight)} lb × ${bestEstimatedSet.actualReps} reps. Target: ${formatNumber(estimatedOneRepMaxTarget.weight)} lb × ${estimatedOneRepMaxTarget.reps} reps${estimatedOneRepMaxRange ? ` (within the ${formatRepRange(estimatedOneRepMaxRange)} rep range)` : ""}.`,
      },
      {
        label: "Volume load",
        description:
          volumeLoad === null || volumeLoadTarget === null
            ? "Log weight and reps for every set in a session to calculate a numeric target."
            : `Last total: ${formatNumber(volumeLoad)} lb·reps. Target: ${formatNumber(volumeLoadTarget.volumeLoad)} lb·reps; progress Set ${volumeLoadTarget.setNumber} to ${formatNumber(volumeLoadTarget.weight)} lb × ${volumeLoadTarget.reps} reps${volumeLoadRange ? ` (within the ${formatRepRange(volumeLoadRange)} rep range)` : ""}.`,
      },
      {
        label: "Heaviest load",
        description:
          heaviestSet === null || heaviestLoadTarget === null
            ? "Log a weighted set to establish a numeric baseline."
            : `Last top set: ${formatNumber(heaviestSet.weight)} lb × ${heaviestSet.actualReps} reps. Target: ${formatNumber(heaviestLoadTarget.weight)} lb for at least ${heaviestLoadTarget.reps} reps${heaviestLoadRange ? ` (within the ${formatRepRange(heaviestLoadRange)} rep range)` : ""}.`,
      },
    ],
  };
}
