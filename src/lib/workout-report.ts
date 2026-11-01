import type { WorkoutReportCategory } from "../constants/profile-copy/character-copy";
import type {
  ExerciseProgressEntry,
  ProgressExerciseSet,
  WorkoutSessionExercise,
} from "./workouts";

export type WorkoutReportExerciseStatus =
  | "up"
  | "steady"
  | "declining"
  | "not-scored";

export type WorkoutReportExerciseAssessment = {
  status: WorkoutReportExerciseStatus;
  isScorable: boolean;
  explanations: string[];
};

type RepRange = {
  min: number;
  max: number | null;
};

type WeightedSet = ProgressExerciseSet & {
  weight: number;
  reps: number;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);

function formatPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function getUsableReps(set: ProgressExerciseSet): number | null {
  return set.actualReps !== null && set.actualReps > 0
    ? set.actualReps
    : null;
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

function getWeightedSets(sets: ProgressExerciseSet[]): WeightedSet[] {
  return sets.flatMap((set) => {
    const weight = getUsableWeight(set.actualWeight);
    const reps = getUsableReps(set);
    return weight === null || reps === null ? [] : [{ ...set, weight, reps }];
  });
}

function getEstimatedOneRepMax(sets: WeightedSet[]): number | null {
  return sets.reduce<number | null>((best, set) => {
    const estimate = set.weight * (1 + set.reps / 30);
    return best === null || estimate > best ? estimate : best;
  }, null);
}

function getHeaviestLoad(sets: WeightedSet[]): number | null {
  return sets.reduce<number | null>(
    (heaviest, set) =>
      heaviest === null || set.weight > heaviest ? set.weight : heaviest,
    null,
  );
}

function getTotalRepsByWeight(sets: WeightedSet[]): Map<number, number> {
  const totals = new Map<number, number>();
  for (const set of sets) {
    totals.set(set.weight, (totals.get(set.weight) ?? 0) + set.reps);
  }
  return totals;
}

function areAllSetsWithinRepRanges(sets: ProgressExerciseSet[]): boolean {
  return (
    sets.length > 0 &&
    sets.every((set) => {
      const reps = getUsableReps(set);
      const range = parseRepRange(set.targetReps);
      return (
        reps !== null &&
        range !== null &&
        reps >= range.min &&
        (range.max === null || reps <= range.max)
      );
    })
  );
}

function formatWorkoutSetBreakdown(
  label: string,
  sets: ProgressExerciseSet[],
): string {
  const setDetails = sets.map((set) => {
    const weight = getUsableWeight(set.actualWeight);
    const weightLabel =
      weight === null ? "no added weight" : `${formatNumber(weight)} lb`;
    const repsLabel =
      set.actualReps === null ? "not completed" : `${set.actualReps} reps`;
    return `Set ${set.setNumber}: ${weightLabel} × ${repsLabel}`;
  });

  return `${label}: ${setDetails.length > 0 ? setDetails.join("; ") : "No sets were recorded."}`;
}

function getWeightedAssessment(
  current: WorkoutSessionExercise,
  previous: ExerciseProgressEntry,
): WorkoutReportExerciseAssessment {
  const currentSets = getWeightedSets(current.sets);
  const previousSets = getWeightedSets(previous.sets);
  const currentOneRepMax = getEstimatedOneRepMax(currentSets);
  const previousOneRepMax = getEstimatedOneRepMax(previousSets);
  const oneRepMaxChange =
    currentOneRepMax !== null && previousOneRepMax !== null
      ? ((currentOneRepMax - previousOneRepMax) / previousOneRepMax) * 100
      : null;
  const currentHeaviestLoad = getHeaviestLoad(currentSets);
  const previousHeaviestLoad = getHeaviestLoad(previousSets);
  const currentRepsByWeight = getTotalRepsByWeight(currentSets);
  const previousRepsByWeight = getTotalRepsByWeight(previousSets);
  const previousSetsByNumber = new Map(
    previous.sets.map((set) => [set.setNumber, set]),
  );
  const sameLoadIncreases = [...currentRepsByWeight.entries()].flatMap(
    ([weight, currentTotal]) => {
      const previousTotal = previousRepsByWeight.get(weight);
      if (previousTotal === undefined || currentTotal <= previousTotal) return [];

      const setChanges = currentSets
        .filter((set) => set.weight === weight)
        .flatMap((set) => {
          const previousSet = previousSetsByNumber.get(set.setNumber);
          if (!previousSet) {
            return [`Set ${set.setNumber} was added for ${set.reps} reps.`];
          }

          const previousReps = getUsableReps(previousSet);
          const previousWeight = getUsableWeight(previousSet.actualWeight);
          if (previousReps === null) {
            return [
              `Set ${set.setNumber} has ${set.reps} completed reps; it was not completed last time.`,
            ];
          }

          if (set.reps > previousReps) {
            return [
              previousWeight === weight
                ? `Set ${set.setNumber} increased from ${previousReps} to ${set.reps} reps.`
                : `Set ${set.setNumber} increased from ${previousReps} reps at ${previousWeight === null ? "no added weight" : `${formatNumber(previousWeight)} lb`} to ${set.reps} reps at ${formatNumber(weight)} lb.`,
            ];
          }

          return previousWeight !== weight
            ? [
                `Set ${set.setNumber} moved from ${previousWeight === null ? "no added weight" : `${formatNumber(previousWeight)} lb`} to ${formatNumber(weight)} lb for ${set.reps} reps.`,
              ]
            : [];
        });

      return [
        `At ${formatNumber(weight)} lb, total reps increased from ${previousTotal} to ${currentTotal}${setChanges.length > 0 ? `: ${setChanges.join("; ")}` : "."}`,
      ];
    },
  );
  const allCurrentSetsWithinRange = areAllSetsWithinRepRanges(current.sets);
  const loadIncreased =
    currentHeaviestLoad !== null &&
    (previousHeaviestLoad === null ||
      currentHeaviestLoad > previousHeaviestLoad);
  const loadIncreaseCounts =
    loadIncreased && allCurrentSetsWithinRange;
  const oneRepMaxExplanation =
    oneRepMaxChange === null
      ? "Estimated 1RM could not be compared because one workout has no completed weighted sets."
      : previousOneRepMax === currentOneRepMax
        ? `Estimated 1RM remained steady at ${formatNumber(currentOneRepMax!)} lb.`
        : formatNumber(previousOneRepMax!) === formatNumber(currentOneRepMax!)
          ? `Estimated 1RM stayed around ${formatNumber(currentOneRepMax!)} lb (${formatPercent(oneRepMaxChange)}).`
        : `Estimated 1RM changed from ${formatNumber(previousOneRepMax!)} lb to ${formatNumber(currentOneRepMax!)} lb (${formatPercent(oneRepMaxChange)}).`;
  const positiveReasons = [
    ...(oneRepMaxChange !== null && oneRepMaxChange > 0
      ? [
          `Estimated 1RM increased from ${formatNumber(previousOneRepMax!)} lb to ${formatNumber(currentOneRepMax!)} lb (${formatPercent(oneRepMaxChange)}).`,
        ]
      : []),
    ...sameLoadIncreases,
    ...(loadIncreaseCounts
      ? [
          `Weight increased from ${previousHeaviestLoad === null ? "no added weight" : `${formatNumber(previousHeaviestLoad)} lb`} to ${formatNumber(currentHeaviestLoad)} lb while all sets stayed within their suggested rep ranges.`,
        ]
      : []),
  ];
  const explanations = [
    oneRepMaxExplanation,
    ...(sameLoadIncreases.length > 0
      ? sameLoadIncreases
      : loadIncreased
        ? []
        : [
            formatWorkoutSetBreakdown("Previous workout", previous.sets),
            formatWorkoutSetBreakdown("This workout", current.sets),
          ]),
    ...(loadIncreased
      ? [
          allCurrentSetsWithinRange
            ? `Weight increased from ${previousHeaviestLoad === null ? "no added weight" : `${formatNumber(previousHeaviestLoad)} lb`} to ${formatNumber(currentHeaviestLoad!)} lb while all sets stayed within their suggested rep ranges.`
            : `Weight increased from ${previousHeaviestLoad === null ? "no added weight" : `${formatNumber(previousHeaviestLoad)} lb`} to ${formatNumber(currentHeaviestLoad!)} lb, but not all sets stayed within their suggested rep ranges.`,
        ]
      : []),
  ];

  if (positiveReasons.length > 0) {
    return {
      status: "up",
      isScorable: true,
      explanations: [
        ...explanations,
        ...(oneRepMaxChange !== null && oneRepMaxChange < 0
          ? [
              `The positive progression signal overrides the ${formatPercent(oneRepMaxChange)} estimated 1RM decline.`,
            ]
          : ["At least one positive progression signal makes this exercise trend up."]),
      ],
    };
  }

  if (oneRepMaxChange === null) {
    return {
      status: "steady",
      isScorable: false,
      explanations: [
        ...explanations,
        "There is not enough comparable weighted-set data to score this exercise.",
      ],
    };
  }

  if (oneRepMaxChange < -2) {
    return {
      status: "declining",
      isScorable: true,
      explanations: [
        ...explanations,
        "Estimated 1RM declined by more than 2% without another positive progression signal.",
      ],
    };
  }

  return {
    status: "steady",
    isScorable: true,
    explanations: [
      ...explanations,
      "Estimated 1RM did not decline by more than 2%, and no positive progression signal was recorded.",
    ],
  };
}

function getBodyweightAssessment(
  current: WorkoutSessionExercise,
  previous: ExerciseProgressEntry,
): WorkoutReportExerciseAssessment {
  const currentSetReps = current.sets
    .map(getUsableReps)
    .filter((reps): reps is number => reps !== null);
  const previousSetReps = previous.sets
    .map(getUsableReps)
    .filter((reps): reps is number => reps !== null);
  const currentTotalReps = currentSetReps.reduce(
    (total, reps) => total + reps,
    0,
  );
  const previousTotalReps = previousSetReps.reduce(
    (total, reps) => total + reps,
    0,
  );
  const currentBestSet = Math.max(...currentSetReps);
  const previousBestSet = Math.max(...previousSetReps);

  if (
    currentSetReps.length === 0 ||
    previousSetReps.length === 0 ||
    previousTotalReps === 0
  ) {
    return {
      status: "steady",
      isScorable: false,
      explanations: [
        "There are not enough completed reps in both workouts to score this bodyweight exercise.",
      ],
    };
  }

  const totalRepChangePercent =
    ((currentTotalReps - previousTotalReps) / previousTotalReps) * 100;
  const totalRepsIncreased = currentTotalReps > previousTotalReps;
  const bestSetIncreased = currentBestSet > previousBestSet;
  const explanations = [
    `Total reps changed from ${previousTotalReps} to ${currentTotalReps} (${formatPercent(totalRepChangePercent)}).`,
    `Best set changed from ${previousBestSet} to ${currentBestSet} reps.`,
  ];

  if (totalRepsIncreased || bestSetIncreased) {
    return {
      status: "up",
      isScorable: true,
      explanations: [
        ...explanations,
        "More total reps or a higher-rep set counts as positive bodyweight progress.",
        ...(totalRepChangePercent < 0
          ? [
              `The positive rep signal overrides the ${formatPercent(totalRepChangePercent)} total-rep decline.`,
            ]
          : []),
      ],
    };
  }

  if (totalRepChangePercent <= -5) {
    return {
      status: "declining",
      isScorable: true,
      explanations: [
        ...explanations,
        "Total reps declined by 5% or more without a higher-rep set.",
      ],
    };
  }

  return {
    status: "steady",
    isScorable: true,
    explanations: [
      ...explanations,
      "Total reps did not decline by 5% or more, and neither total reps nor best-set reps increased.",
    ],
  };
}

export function assessWorkoutReportExercise(
  current: WorkoutSessionExercise,
  previous: ExerciseProgressEntry | null,
  history: ExerciseProgressEntry[],
): WorkoutReportExerciseAssessment {
  if (current.sourceWorkoutExerciseId === null) {
    return {
      status: "not-scored",
      isScorable: false,
      explanations: [
        "This exercise was added during the workout and is excluded from progress scoring.",
      ],
    };
  }

  if (previous === null) {
    return {
      status: "steady",
      isScorable: false,
      explanations: [
        "There is no previous completed workout for this exercise to compare.",
      ],
    };
  }

  const hasWeightedHistory =
    current.sets.some((set) => getUsableWeight(set.actualWeight) !== null) ||
    history.some((entry) =>
      entry.sets.some((set) => getUsableWeight(set.actualWeight) !== null),
    );

  return hasWeightedHistory
    ? getWeightedAssessment(current, previous)
    : getBodyweightAssessment(current, previous);
}

export function getWorkoutReportCategory(
  assessments: WorkoutReportExerciseAssessment[],
): WorkoutReportCategory {
  const scorable = assessments.filter((assessment) => assessment.isScorable);
  if (scorable.length === 0) return "steady";

  const positiveCount = scorable.filter(
    (assessment) => assessment.status === "up",
  ).length;
  const positiveRatio = positiveCount / scorable.length;

  if (positiveRatio >= 0.2) return "great";
  if (positiveRatio >= 0.05) return "good";
  if (
    positiveCount === 0 &&
    scorable.some((assessment) => assessment.status === "declining")
  ) {
    return "declining";
  }
  return "steady";
}
