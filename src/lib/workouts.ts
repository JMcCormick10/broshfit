import { getSupabaseClient } from "./supabase";
import type { Database, Json } from "./database.types";

export type WorkoutSetInput = {
  reps: string | null;
};

export type WorkoutExerciseInput = {
  exerciseId: string;
  targetSets: WorkoutSetInput[];
};

type CreateWorkoutInput = {
  name: string;
  exercises: WorkoutExerciseInput[];
};

export type WorkoutRoutineEntry = WorkoutExerciseInput & {
  exerciseName: string;
  equipment: string;
};

export type WorkoutRoutine = {
  id: string;
  name: string;
  createdAt: string;
  archivedAt: string | null;
  entries: WorkoutRoutineEntry[];
};

export type CompletedWorkoutSummary = {
  id: string;
  routineName: string;
  completedAt: string;
  sessionId: string | null;
};

export type CompletedWorkoutExerciseUpdate = {
  sessionExerciseId: string;
  sets: {
    setNumber: number;
    actualReps: number | null;
    actualWeight: string | null;
  }[];
  notes: string;
  completedOrder: number;
};

export type WorkoutSessionSet = {
  setNumber: number;
  targetReps: string | null;
  actualReps: number | null;
  actualWeight: string | null;
};

export type WorkoutSessionExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  equipment: string;
  routinePosition: number;
  prescribedSetCount: number;
  completedOrder: number | null;
  completedAt: string | null;
  notes: string;
  sets: WorkoutSessionSet[];
};

export type WorkoutSession = {
  id: string;
  routineId: string;
  routineName: string;
  startedAt: string;
  exercises: WorkoutSessionExercise[];
};

export function applySetWeightChange(
  sets: WorkoutSessionSet[],
  setNumber: number,
  weight: string | null,
): WorkoutSessionSet[] {
  return sets.map((set) => {
    if (set.setNumber === setNumber) return { ...set, actualWeight: weight };
    if (setNumber === 1 && set.actualWeight === null) {
      return { ...set, actualWeight: weight };
    }
    return set;
  });
}

type WorkoutExerciseRow =
  Database["public"]["Tables"]["workout_exercises"]["Row"];
type WorkoutSetRow = Database["public"]["Tables"]["workout_sets"]["Row"];
type WorkoutSessionExerciseRow =
  Database["public"]["Tables"]["workout_session_exercises"]["Row"];
type WorkoutSessionSetRow =
  Database["public"]["Tables"]["workout_session_sets"]["Row"];

export async function createWorkout({
  name,
  exercises,
}: CreateWorkoutInput): Promise<string> {
  const workoutItems: Json = exercises.map((exercise) => ({
    exerciseId: exercise.exerciseId,
    targetSets: exercise.targetSets,
  }));

  const { data, error } = await getSupabaseClient().rpc("create_workout", {
    workout_name: name,
    workout_items: workoutItems,
  });

  if (
    error?.code === "23505" &&
    error.message.includes("workouts_normalized_name_key")
  ) {
    throw new Error("A workout with this name already exists.");
  }

  if (error) throw error;
  if (!data) throw new Error("Workout creation returned no ID.");
  return data;
}

export async function updateWorkout(
  id: string,
  { name, exercises }: CreateWorkoutInput,
): Promise<string> {
  const workoutItems: Json = exercises.map((exercise) => ({
    exerciseId: exercise.exerciseId,
    targetSets: exercise.targetSets,
  }));

  const { data, error } = await getSupabaseClient().rpc("update_workout", {
    target_workout_id: id,
    workout_name: name,
    workout_items: workoutItems,
  });

  if (
    error?.code === "23505" &&
    error.message.includes("workouts_normalized_name_key")
  ) {
    throw new Error("A workout routine with this name already exists.");
  }

  if (error) throw error;
  if (!data) throw new Error("Workout update returned no ID.");
  return data;
}

export async function setWorkoutArchived(
  id: string,
  isArchived: boolean,
): Promise<void> {
  const { error } = await getSupabaseClient().rpc("archive_workout", {
    target_workout_id: id,
    should_archive: isArchived,
  });

  if (error) throw error;
}

export async function deleteWorkout(id: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient().rpc("delete_workout", {
    target_workout_id: id,
  });

  if (error) throw error;
  if (data === null) throw new Error("Workout deletion returned no result.");
  return data;
}

export async function deleteCompletedWorkout(sessionId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("delete_completed_workout", {
    target_session_id: sessionId,
  });

  if (error) throw error;
}

export async function getWorkoutRoutines(
  includeArchived = false,
): Promise<WorkoutRoutine[]> {
  const client = getSupabaseClient();
  const workoutsQuery = client
    .from("workouts")
    .select("id, name, created_at, archived_at")
    .order("name", { ascending: true });
  const workoutsResult = includeArchived
    ? await workoutsQuery.not("archived_at", "is", null)
    : await workoutsQuery.is("archived_at", null);

  if (workoutsResult.error) throw workoutsResult.error;
  if (workoutsResult.data.length === 0) return [];

  const workoutIds = workoutsResult.data.map((workout) => workout.id);
  const [entriesResult, exercisesResult] = await Promise.all([
    client
      .from("workout_exercises")
      .select("id, workout_id, exercise_id, position")
      .in("workout_id", workoutIds)
      .order("position", { ascending: true }),
    client.from("exercises").select("id, name, equipment"),
  ]);

  if (entriesResult.error) throw entriesResult.error;
  if (exercisesResult.error) throw exercisesResult.error;

  const entryIds = entriesResult.data.map((entry) => entry.id);
  const setsResult =
    entryIds.length > 0
      ? await client
          .from("workout_sets")
          .select("workout_exercise_id, set_number, target_reps")
          .in("workout_exercise_id", entryIds)
          .order("set_number", { ascending: true })
      : { data: [] as WorkoutSetRow[], error: null };

  if (setsResult.error) throw setsResult.error;

  const entriesByWorkout = new Map<string, WorkoutExerciseRow[]>();
  for (const entry of entriesResult.data) {
    const workoutEntries = entriesByWorkout.get(entry.workout_id) ?? [];
    workoutEntries.push(entry);
    entriesByWorkout.set(entry.workout_id, workoutEntries);
  }

  const setsByEntry = new Map<string, WorkoutSetRow[]>();
  for (const set of setsResult.data) {
    const entrySets = setsByEntry.get(set.workout_exercise_id) ?? [];
    entrySets.push(set);
    setsByEntry.set(set.workout_exercise_id, entrySets);
  }

  const exercisesById = new Map(
    exercisesResult.data.map((exercise) => [exercise.id, exercise]),
  );

  return workoutsResult.data.map((workout) => ({
    id: workout.id,
    name: workout.name,
    createdAt: workout.created_at,
    archivedAt: workout.archived_at,
    entries: (entriesByWorkout.get(workout.id) ?? []).map((entry) => {
      const exercise = exercisesById.get(entry.exercise_id);
      const sets = setsByEntry.get(entry.id) ?? [];

      return {
        exerciseId: entry.exercise_id,
        exerciseName: exercise?.name ?? "Exercise unavailable",
        equipment: exercise?.equipment ?? "",
        targetSets: sets.map((set) => ({
          reps: set.target_reps,
        })),
      };
    }),
  }));
}

export async function getCompletedWorkoutHistory(
  limit?: number,
): Promise<CompletedWorkoutSummary[]> {
  const client = getSupabaseClient();
  const historyQuery = client
    .from("completed_workouts")
    .select("id, workout_id, completed_at, session_id")
    .order("completed_at", { ascending: false });
  const completionResult = await (limit
    ? historyQuery.limit(limit)
    : historyQuery);

  if (completionResult.error) throw completionResult.error;
  if (completionResult.data.length === 0) return [];

  const workoutIds = [
    ...new Set(
      completionResult.data.map((completion) => completion.workout_id),
    ),
  ];
  const workoutResult = await client
    .from("workouts")
    .select("id, name")
    .in("id", workoutIds);

  if (workoutResult.error) throw workoutResult.error;

  const workoutNames = new Map(
    workoutResult.data.map((workout) => [workout.id, workout.name]),
  );

  return completionResult.data.map((completion) => ({
    id: completion.id,
    routineName:
      workoutNames.get(completion.workout_id) ?? "Deleted workout routine",
    completedAt: completion.completed_at,
    sessionId: completion.session_id,
  }));
}

export async function getWorkoutSession(
  sessionId: string,
): Promise<WorkoutSession> {
  const client = getSupabaseClient();
  const { data: session, error: sessionError } = await client
    .from("workout_sessions")
    .select("id, workout_id, started_at")
    .eq("id", sessionId)
    .single();

  if (sessionError) throw sessionError;

  const [workoutResult, entriesResult, exercisesResult] = await Promise.all([
    client
      .from("workouts")
      .select("name")
      .eq("id", session.workout_id)
      .single(),
    client
      .from("workout_session_exercises")
      .select(
        "id, session_id, source_workout_exercise_id, exercise_id, routine_position, prescribed_set_count, completed_order, completed_at, notes",
      )
      .eq("session_id", sessionId)
      .order("routine_position", { ascending: true }),
    client.from("exercises").select("id, name, equipment"),
  ]);

  if (workoutResult.error) throw workoutResult.error;
  if (entriesResult.error) throw entriesResult.error;
  if (exercisesResult.error) throw exercisesResult.error;

  const entryIds = entriesResult.data.map((entry) => entry.id);
  const setsResult =
    entryIds.length > 0
      ? await client
          .from("workout_session_sets")
          .select(
            "session_exercise_id, set_number, target_reps, actual_reps, actual_weight",
          )
          .in("session_exercise_id", entryIds)
          .order("set_number", { ascending: true })
      : { data: [] as WorkoutSessionSetRow[], error: null };

  if (setsResult.error) throw setsResult.error;

  const setsByEntry = new Map<string, WorkoutSessionSetRow[]>();
  for (const set of setsResult.data) {
    const currentSets = setsByEntry.get(set.session_exercise_id) ?? [];
    currentSets.push(set);
    setsByEntry.set(set.session_exercise_id, currentSets);
  }

  const exercisesById = new Map(
    exercisesResult.data.map((exercise) => [exercise.id, exercise]),
  );

  return {
    id: session.id,
    routineId: session.workout_id,
    routineName: workoutResult.data.name,
    startedAt: session.started_at,
    exercises: entriesResult.data.map((entry: WorkoutSessionExerciseRow) => {
      const exercise = exercisesById.get(entry.exercise_id);

      return {
        id: entry.id,
        exerciseId: entry.exercise_id,
        exerciseName: exercise?.name ?? "Exercise unavailable",
        equipment: exercise?.equipment ?? "",
        routinePosition: entry.routine_position,
        prescribedSetCount: entry.prescribed_set_count,
        completedOrder: entry.completed_order,
        completedAt: entry.completed_at,
        notes: entry.notes,
        sets: (setsByEntry.get(entry.id) ?? []).map((set) => ({
          setNumber: set.set_number,
          targetReps: set.target_reps,
          actualReps: set.actual_reps,
          actualWeight: set.actual_weight,
        })),
      };
    }),
  };
}

export type ExerciseHistorySet = {
  setNumber: number;
  actualReps: number | null;
  actualWeight: string | null;
};

export type ExerciseHistory = {
  completedAt: string;
  notes: string;
  sets: ExerciseHistorySet[];
  contextSentences: string[];
};

function formatOrdinal(position: number): string {
  const remainder = position % 100;
  if (remainder >= 11 && remainder <= 13) return `${position}th`;
  switch (position % 10) {
    case 1:
      return `${position}st`;
    case 2:
      return `${position}nd`;
    case 3:
      return `${position}rd`;
    default:
      return `${position}th`;
  }
}

function formatMuscleList(names: string[]): string {
  const lowered = names.map((name) => name.toLowerCase());
  if (lowered.length <= 1) return lowered[0] ?? "";
  if (lowered.length === 2) return `${lowered[0]} and ${lowered[1]}`;
  return `${lowered.slice(0, -1).join(", ")}, and ${lowered[lowered.length - 1]}`;
}

export async function getExerciseHistory(
  exerciseId: string,
  excludeSessionId: string,
  currentCompletedExerciseIds: string[],
): Promise<ExerciseHistory | null> {
  const client = getSupabaseClient();

  const { data: lastEntries, error: lastError } = await client
    .from("workout_session_exercises")
    .select("id, session_id, completed_at, completed_order, notes")
    .eq("exercise_id", exerciseId)
    .not("completed_at", "is", null)
    .neq("session_id", excludeSessionId)
    .order("completed_at", { ascending: false })
    .limit(1);

  if (lastError) throw lastError;

  const lastEntry = lastEntries[0];
  if (!lastEntry) return null;

  const [setsResult, priorResult] = await Promise.all([
    client
      .from("workout_session_sets")
      .select("set_number, actual_reps, actual_weight")
      .eq("session_exercise_id", lastEntry.id)
      .order("set_number", { ascending: true }),
    client
      .from("workout_session_exercises")
      .select("exercise_id, completed_order")
      .eq("session_id", lastEntry.session_id)
      .not("completed_at", "is", null)
      .lt("completed_order", lastEntry.completed_order ?? 0)
      .order("completed_order", { ascending: true }),
  ]);

  if (setsResult.error) throw setsResult.error;
  if (priorResult.error) throw priorResult.error;

  const priorExerciseIds = [
    ...new Set(priorResult.data.map((entry) => entry.exercise_id)),
  ];
  const involvedExerciseIds = [
    ...new Set([
      exerciseId,
      ...priorExerciseIds,
      ...currentCompletedExerciseIds,
    ]),
  ];

  const [targetsResult, groupsResult] = await Promise.all([
    client
      .from("exercise_muscle_groups")
      .select("exercise_id, muscle_group_id, role")
      .in("exercise_id", involvedExerciseIds),
    client.from("muscle_groups").select("id, name"),
  ]);

  if (targetsResult.error) throw targetsResult.error;
  if (groupsResult.error) throw groupsResult.error;

  const groupNames = new Map(
    groupsResult.data.map((group) => [group.id, group.name]),
  );

  const rolesByExercise = new Map<
    string,
    Map<string, "primary" | "secondary">
  >();
  for (const target of targetsResult.data) {
    const roles =
      rolesByExercise.get(target.exercise_id) ??
      new Map<string, "primary" | "secondary">();
    roles.set(
      target.muscle_group_id,
      target.role === "primary" ? "primary" : "secondary",
    );
    rolesByExercise.set(target.exercise_id, roles);
  }

  const ownRoles =
    rolesByExercise.get(exerciseId) ??
    new Map<string, "primary" | "secondary">();

  const primaryMuscleGroups: string[] = [];
  const secondaryMuscleGroups: string[] = [];
  for (const [groupId, role] of ownRoles) {
    const name = groupNames.get(groupId) ?? "Unknown";
    (role === "primary" ? primaryMuscleGroups : secondaryMuscleGroups).push(
      name,
    );
  }

  function sharedByRole(otherExerciseId: string) {
    const sharedPrimary: string[] = [];
    const sharedSecondary: string[] = [];
    for (const groupId of rolesByExercise.get(otherExerciseId)?.keys() ?? []) {
      const ownRole = ownRoles.get(groupId);
      if (!ownRole) continue;
      const name = groupNames.get(groupId) ?? "Unknown";
      (ownRole === "primary" ? sharedPrimary : sharedSecondary).push(name);
    }
    return { sharedPrimary, sharedSecondary };
  }

  const priorExercises = priorResult.data.map((entry) =>
    sharedByRole(entry.exercise_id),
  );

  const currentPosition = currentCompletedExerciseIds.length + 1;
  const priorsWithShared = priorExercises.filter(
    (prior) => prior.sharedPrimary.length + prior.sharedSecondary.length > 0,
  );
  const sharedMuscleNames = [
    ...new Set(
      priorsWithShared.flatMap((prior) => [
        ...prior.sharedPrimary,
        ...prior.sharedSecondary,
      ]),
    ),
  ];
  const currentSharedNames = [
    ...new Set(
      currentCompletedExerciseIds.flatMap((id) => {
        const { sharedPrimary, sharedSecondary } = sharedByRole(id);
        return [...sharedPrimary, ...sharedSecondary];
      }),
    ),
  ];

  const contextSentences: string[] = [];

  if (primaryMuscleGroups.length > 0 || secondaryMuscleGroups.length > 0) {
    const parts: string[] = [];
    if (primaryMuscleGroups.length > 0) {
      parts.push(
        `primarily works your ${formatMuscleList(primaryMuscleGroups)}`,
      );
    }
    if (secondaryMuscleGroups.length > 0) {
      parts.push(
        primaryMuscleGroups.length > 0
          ? `with ${formatMuscleList(secondaryMuscleGroups)} assisting`
          : `works your ${formatMuscleList(secondaryMuscleGroups)} as secondary muscles`,
      );
    }
    contextSentences.push(`This exercise ${parts.join(", ")}.`);
  }

  if (priorExercises.length > 0) {
    contextSentences.push(
      priorsWithShared.length > 0
        ? `Last workout, ${priorsWithShared.length} of the ${priorExercises.length} exercise${priorExercises.length === 1 ? "" : "s"} you completed first also worked your ${formatMuscleList(sharedMuscleNames)}.`
        : "None of the exercises you completed before it that day worked the same muscles.",
    );
  } else {
    contextSentences.push("It was the first exercise you completed that day.");
  }

  if (lastEntry.completed_order !== null) {
    const thatDay = `the ${formatOrdinal(lastEntry.completed_order)} exercise you completed that day`;
    const today =
      currentPosition === 1
        ? "doing it first this session"
        : `doing it ${formatOrdinal(currentPosition)} this session`;
    contextSentences.push(
      lastEntry.completed_order === currentPosition
        ? `It was ${thatDay}, same as this session.`
        : `It was ${thatDay}, compared to ${today}.`,
    );
  }

  if (currentPosition > 1) {
    contextSentences.push(
      currentSharedNames.length > 0
        ? `This session you've already worked your ${formatMuscleList(currentSharedNames)}.`
        : "This session you haven't worked these muscles yet.",
    );
  }

  return {
    completedAt: lastEntry.completed_at,
    notes: lastEntry.notes,
    sets: setsResult.data.map((set) => ({
      setNumber: set.set_number,
      actualReps: set.actual_reps,
      actualWeight: set.actual_weight,
    })),
    contextSentences,
  };
}

export async function getActiveWorkoutSession(): Promise<WorkoutSession | null> {
  const { data, error } = await getSupabaseClient()
    .from("workout_sessions")
    .select("id")
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? getWorkoutSession(data.id) : null;
}

export async function startWorkoutSession(
  routineId: string,
): Promise<WorkoutSession> {
  const { data, error } = await getSupabaseClient().rpc(
    "start_workout_session",
    { target_workout_id: routineId },
  );

  if (error) throw error;
  if (!data) throw new Error("Workout session could not be started.");
  return getWorkoutSession(data);
}

export async function saveWorkoutSessionExercise(
  sessionExerciseId: string,
  sets: WorkoutSessionSet[],
  notes: string,
): Promise<void> {
  const { error } = await getSupabaseClient().rpc(
    "save_workout_session_exercise",
    {
      target_session_exercise_id: sessionExerciseId,
      set_updates: sets.map((set) => ({
        setNumber: set.setNumber,
        actualReps: set.actualReps,
        actualWeight: set.actualWeight,
      })),
      exercise_notes: notes,
    },
  );

  if (error) throw error;
}

export async function addWorkoutSessionSet(
  sessionExerciseId: string,
): Promise<number> {
  const { data, error } = await getSupabaseClient().rpc(
    "add_workout_session_set",
    { target_session_exercise_id: sessionExerciseId },
  );

  if (error) throw error;
  if (data === null) throw new Error("Workout set could not be added.");
  return data;
}

export async function addWorkoutSessionExercise(
  sessionId: string,
  exerciseId: string,
): Promise<void> {
  const { error } = await getSupabaseClient().rpc(
    "add_workout_session_exercise",
    {
      target_session_id: sessionId,
      target_exercise_id: exerciseId,
    },
  );

  if (error) throw error;
}

export async function completeWorkoutSessionExercise(
  sessionExerciseId: string,
  sets: WorkoutSessionSet[],
  notes: string,
  allowIncomplete: boolean,
): Promise<number> {
  const { data, error } = await getSupabaseClient().rpc(
    "complete_workout_session_exercise",
    {
      target_session_exercise_id: sessionExerciseId,
      set_updates: sets.map((set) => ({
        setNumber: set.setNumber,
        actualReps: set.actualReps,
        actualWeight: set.actualWeight,
      })),
      exercise_notes: notes,
      allow_incomplete: allowIncomplete,
    },
  );

  if (error) throw error;
  if (data === null) throw new Error("Exercise could not be completed.");
  return data;
}

export async function reorderCompletedWorkoutExercises(
  sessionId: string,
  orderedExerciseIds: string[],
): Promise<void> {
  const { error } = await getSupabaseClient().rpc(
    "reorder_completed_workout_exercises",
    {
      target_session_id: sessionId,
      ordered_completed_exercise_ids: orderedExerciseIds,
    },
  );

  if (error) throw error;
}

export async function finishWorkoutSession(
  sessionId: string,
  allowIncomplete: boolean,
): Promise<void> {
  const { error } = await getSupabaseClient().rpc("finish_workout_session", {
    target_session_id: sessionId,
    allow_incomplete: allowIncomplete,
  });

  if (error) throw error;
}

export async function discardWorkoutSession(sessionId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("discard_workout_session", {
    target_session_id: sessionId,
  });

  if (error) throw error;
}

export async function updateCompletedWorkoutSession(
  sessionId: string,
  completedAt: string,
  exerciseUpdates: CompletedWorkoutExerciseUpdate[],
): Promise<void> {
  const { error } = await getSupabaseClient().rpc(
    "update_completed_workout_session",
    {
      target_session_id: sessionId,
      completion_completed_at: completedAt,
      exercise_updates: exerciseUpdates,
    },
  );

  if (error) throw error;
}
