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
    actualWeight: number | null;
  }[];
  notes: string;
  completedOrder: number;
};

export type WorkoutSessionSet = {
  setNumber: number;
  targetReps: string | null;
  actualReps: number | null;
  actualWeight: number | null;
};

export type WorkoutSessionExercise = {
  id: string;
  sourceWorkoutExerciseId: string | null;
  wasRoutineExercise: boolean;
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
  routineId: string | null;
  routineName: string;
  startedAt: string;
  exercises: WorkoutSessionExercise[];
};

export type ProgressExerciseSet = {
  setNumber: number;
  targetReps: string | null;
  actualReps: number | null;
  actualWeight: number | null;
};

export type ExerciseProgressEntry = {
  id: string;
  sessionId: string;
  routineId: string | null;
  sourceWorkoutExerciseId: string | null;
  wasRoutineExercise: boolean;
  exerciseId: string;
  exerciseName: string;
  equipment: string;
  completedAt: string;
  sets: ProgressExerciseSet[];
};

export async function getExerciseProgress(
  exerciseId?: string | readonly string[],
): Promise<ExerciseProgressEntry[]> {
  const exerciseIds =
    typeof exerciseId === "string" ? [exerciseId] : exerciseId;
  if (exerciseIds?.length === 0) return [];

  const client = getSupabaseClient();
  const entriesQuery = client
    .from("workout_session_exercises")
    .select(
      "id, session_id, source_workout_exercise_id, was_routine_exercise, exercise_id, completed_at",
    )
    .not("completed_at", "is", null);
  const exercisesQuery = client
    .from("exercises")
    .select("id, name, equipment");
  const [entriesResult, exercisesResult] = await Promise.all([
    exerciseIds ? entriesQuery.in("exercise_id", [...exerciseIds]) : entriesQuery,
    exerciseIds
      ? exercisesQuery.in("id", [...exerciseIds])
      : exercisesQuery,
  ]);

  if (entriesResult.error) throw entriesResult.error;
  if (exercisesResult.error) throw exercisesResult.error;
  if (entriesResult.data.length === 0) return [];

  const entryIds = entriesResult.data.map((entry) => entry.id);
  const sessionIds = [...new Set(entriesResult.data.map((entry) => entry.session_id))];
  const [setsResult, sessionResult, completionResult] = await Promise.all([
    client
      .from("workout_session_sets")
      .select(
        "session_exercise_id, set_number, target_reps, actual_reps, actual_weight",
      )
      .in("session_exercise_id", entryIds)
      .order("set_number", { ascending: true }),
    client
      .from("workout_sessions")
      .select("id, completed_at, workout_id")
      .in("id", sessionIds),
    client
      .from("completed_workouts")
      .select("session_id, completed_at")
      .in("session_id", sessionIds)
      .order("completed_at", { ascending: false }),
  ]);
  if (setsResult.error) throw setsResult.error;
  if (sessionResult.error) throw sessionResult.error;
  if (completionResult.error) throw completionResult.error;

  const exerciseById = new Map(exercisesResult.data.map((exercise) => [exercise.id, exercise]));
  const sessionCompletedAtById = new Map(
    sessionResult.data.map((session) => [session.id, session.completed_at]),
  );
  const sessionRoutineIdById = new Map(
    sessionResult.data.map((session) => [session.id, session.workout_id]),
  );
  const workoutCompletedAtBySessionId = new Map<string, string>();
  for (const completion of completionResult.data) {
    if (
      completion.session_id &&
      !workoutCompletedAtBySessionId.has(completion.session_id)
    ) {
      workoutCompletedAtBySessionId.set(
        completion.session_id,
        completion.completed_at,
      );
    }
  }
  const setsByEntry = new Map<string, ProgressExerciseSet[]>();
  for (const set of setsResult.data) {
    const sets = setsByEntry.get(set.session_exercise_id) ?? [];
    sets.push({
      setNumber: set.set_number,
      targetReps: set.target_reps,
      actualReps: set.actual_reps,
      actualWeight: set.actual_weight,
    });
    setsByEntry.set(set.session_exercise_id, sets);
  }

  return entriesResult.data.flatMap((entry) => {
    const completedAt =
      workoutCompletedAtBySessionId.get(entry.session_id) ??
      sessionCompletedAtById.get(entry.session_id);
    if (completedAt === undefined || completedAt === null) return [];

    const exercise = exerciseById.get(entry.exercise_id);
    return [{
      id: entry.id,
      sessionId: entry.session_id,
      routineId: sessionRoutineIdById.get(entry.session_id) ?? null,
      sourceWorkoutExerciseId: entry.source_workout_exercise_id,
      wasRoutineExercise: entry.was_routine_exercise,
      exerciseId: entry.exercise_id,
      exerciseName: exercise?.name ?? "Exercise unavailable",
      equipment: exercise?.equipment ?? "",
      completedAt,
      sets: setsByEntry.get(entry.id) ?? [],
    }];
  }).sort(
    (first, second) =>
      new Date(second.completedAt).getTime() -
      new Date(first.completedAt).getTime(),
  );
}

export function applySetWeightChange(
  sets: WorkoutSessionSet[],
  setNumber: number,
  weight: number | null,
): WorkoutSessionSet[] {
  return sets.map((set) =>
    set.setNumber === setNumber ? { ...set, actualWeight: weight } : set,
  );
}

export function inheritFirstSetWeight(
  sets: WorkoutSessionSet[],
): WorkoutSessionSet[] {
  const firstWeight =
    sets.find((set) => set.setNumber === 1)?.actualWeight ?? null;
  if (firstWeight === null) return sets;

  return sets.map((set) =>
    set.setNumber > 1 && set.actualWeight === null
      ? { ...set, actualWeight: firstWeight }
      : set,
  );
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
      completionResult.data.flatMap((completion) =>
        completion.workout_id ? [completion.workout_id] : [],
      ),
    ),
  ];
  const sessionIds = [
    ...new Set(
      completionResult.data.flatMap((completion) =>
        completion.session_id ? [completion.session_id] : [],
      ),
    ),
  ];
  const workoutNames = new Map<string, string>();
  const freestyleNames = new Map<string, string | null>();

  if (workoutIds.length > 0) {
    const workoutResult = await client
      .from("workouts")
      .select("id, name")
      .in("id", workoutIds);
    if (workoutResult.error) throw workoutResult.error;
    for (const workout of workoutResult.data) {
      workoutNames.set(workout.id, workout.name);
    }
  }

  if (sessionIds.length > 0) {
    const sessionResult = await client
      .from("workout_sessions")
      .select("id, workout_name")
      .in("id", sessionIds);
    if (sessionResult.error) throw sessionResult.error;
    for (const session of sessionResult.data) {
      freestyleNames.set(session.id, session.workout_name);
    }
  }

  return completionResult.data.map((completion) => {
    const routineName =
      completion.workout_id !== null
        ? workoutNames.get(completion.workout_id) ?? "Deleted workout routine"
        : completion.session_id
          ? freestyleNames.get(completion.session_id)
          : null;
    if (!routineName) {
      throw new Error(
        `Completed workout ${completion.id} is missing its workout name.`,
      );
    }

    return {
      id: completion.id,
      routineName,
      completedAt: completion.completed_at,
      sessionId: completion.session_id,
    };
  });
}

export async function getWorkoutSession(
  sessionId: string,
): Promise<WorkoutSession> {
  const client = getSupabaseClient();
  const { data: session, error: sessionError } = await client
    .from("workout_sessions")
    .select("id, workout_id, workout_name, started_at")
    .eq("id", sessionId)
    .single();

  if (sessionError) throw sessionError;

  let routineName = session.workout_name;
  if (session.workout_id !== null) {
    const workoutResult = await client
      .from("workouts")
      .select("name")
      .eq("id", session.workout_id)
      .single();
    if (workoutResult.error) throw workoutResult.error;
    routineName = workoutResult.data.name;
  }
  if (!routineName) {
    throw new Error(`Workout session ${sessionId} is missing its name.`);
  }

  const [entriesResult, exercisesResult] = await Promise.all([
    client
      .from("workout_session_exercises")
      .select(
        "id, session_id, source_workout_exercise_id, was_routine_exercise, exercise_id, routine_position, prescribed_set_count, completed_order, completed_at, notes",
      )
      .eq("session_id", sessionId)
      .order("routine_position", { ascending: true }),
    client.from("exercises").select("id, name, equipment"),
  ]);

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
    routineName,
    startedAt: session.started_at,
    exercises: entriesResult.data.map((entry: WorkoutSessionExerciseRow) => {
      const exercise = exercisesById.get(entry.exercise_id);

      return {
        id: entry.id,
        sourceWorkoutExerciseId: entry.source_workout_exercise_id,
        wasRoutineExercise: entry.was_routine_exercise,
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
  actualWeight: number | null;
};

export type ExerciseHistoryMode = "routine" | "any";

export type ExerciseHistory = {
  completedAt: string;
  comparisonScope: ExerciseHistoryMode;
  notes: string;
  sets: ExerciseHistorySet[];
};

export type ExerciseHistoryResult = {
  hasCompletedRoutine: boolean;
  history: ExerciseHistory | null;
};

export async function getCompletedRoutineSessionIds(
  routineId: string,
  excludeSessionId: string,
  startedBefore?: string,
): Promise<string[]> {
  let query = getSupabaseClient()
    .from("workout_sessions")
    .select("id")
    .eq("workout_id", routineId)
    .eq("status", "completed")
    .neq("id", excludeSessionId);

  if (startedBefore !== undefined) {
    query = query.lt("started_at", startedBefore);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.map((session) => session.id);
}

export async function getExerciseHistory(
  exerciseId: string,
  excludeSessionId: string,
  routineId: string | null,
  historyMode: ExerciseHistoryMode,
): Promise<ExerciseHistoryResult> {
  const client = getSupabaseClient();

  let lastEntry: {
    id: string;
    completed_at: string;
    notes: string;
  } | null = null;
  let comparisonScope: ExerciseHistoryMode = "any";
  let routineSessionIds: string[] = [];

  if (routineId !== null) {
    routineSessionIds = await getCompletedRoutineSessionIds(
      routineId,
      excludeSessionId,
    );
  }

  if (historyMode === "routine" && routineSessionIds.length > 0) {
    const { data: routineEntries, error: routineEntriesError } = await client
      .from("workout_session_exercises")
      .select("id, completed_at, notes")
      .eq("exercise_id", exerciseId)
      .in("session_id", routineSessionIds)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1);

    if (routineEntriesError) throw routineEntriesError;
    lastEntry = routineEntries[0] ?? null;
    if (lastEntry) comparisonScope = "routine";
  }

  if (!lastEntry) {
    const { data: lastEntries, error: lastError } = await client
      .from("workout_session_exercises")
      .select("id, completed_at, notes")
      .eq("exercise_id", exerciseId)
      .not("completed_at", "is", null)
      .neq("session_id", excludeSessionId)
      .order("completed_at", { ascending: false })
      .limit(1);

    if (lastError) throw lastError;
    lastEntry = lastEntries[0] ?? null;
  }

  if (!lastEntry) {
    return {
      hasCompletedRoutine: routineSessionIds.length > 0,
      history: null,
    };
  }

  const setsResult = await client
    .from("workout_session_sets")
    .select("set_number, actual_reps, actual_weight")
    .eq("session_exercise_id", lastEntry.id)
    .order("set_number", { ascending: true });

  if (setsResult.error) throw setsResult.error;

  return {
    hasCompletedRoutine: routineSessionIds.length > 0,
    history: {
      completedAt: lastEntry.completed_at,
      comparisonScope,
      notes: lastEntry.notes,
      sets: setsResult.data.map((set) => ({
        setNumber: set.set_number,
        actualReps: set.actual_reps,
        actualWeight: set.actual_weight,
      })),
    },
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

export async function startFreestyleWorkoutSession(): Promise<WorkoutSession> {
  const { data, error } = await getSupabaseClient().rpc(
    "start_freestyle_workout_session",
  );

  if (error) throw error;
  if (!data) throw new Error("Freestyle workout session could not be started.");
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
