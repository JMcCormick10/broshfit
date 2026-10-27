import { getSupabaseClient } from "./supabase";
import type { Database, ExerciseEquipment } from "./database.types";
import { getMuscleGroups } from "./muscle-groups";

export type ExerciseInput = {
  name: string;
  equipment: ExerciseEquipment;
  primaryMuscleGroupIds: string[];
  secondaryMuscleGroupIds: string[];
};

type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];
type ExerciseMuscleGroupRow =
  Database["public"]["Tables"]["exercise_muscle_groups"]["Row"];

export type ExerciseRecord = ExerciseRow &
  ExerciseInput & {
    primaryMuscleGroups: string[];
    secondaryMuscleGroups: string[];
  };

function throwIfDuplicate(error: { code?: string; message: string } | null) {
  if (
    error?.code === "23505" &&
    error.message.includes("exercises_equipment_normalized_name_key")
  ) {
    throw new Error("An exercise with this name and equipment already exists.");
  }

  if (error) throw error;
}

export async function createExercise(input: ExerciseInput): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc("create_exercise", {
    exercise_name: input.name,
    exercise_equipment: input.equipment,
    primary_muscle_group_ids: input.primaryMuscleGroupIds,
    secondary_muscle_group_ids: input.secondaryMuscleGroupIds,
  });

  throwIfDuplicate(error);
  if (!data) throw new Error("Exercise creation returned no ID.");
  return data;
}

export async function updateExercise(
  id: string,
  input: ExerciseInput,
): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc("update_exercise", {
    target_exercise_id: id,
    exercise_name: input.name,
    exercise_equipment: input.equipment,
    primary_muscle_group_ids: input.primaryMuscleGroupIds,
    secondary_muscle_group_ids: input.secondaryMuscleGroupIds,
  });

  throwIfDuplicate(error);
  if (!data) throw new Error("Exercise update returned no ID.");
  return data;
}

export async function getExercises(): Promise<ExerciseRecord[]> {
  const client = getSupabaseClient();
  const [exercisesResult, targetsResult, muscleGroups] = await Promise.all([
    client
      .from("exercises")
      .select("id, name, equipment, created_at")
      .order("name", { ascending: true }),
    client
      .from("exercise_muscle_groups")
      .select("exercise_id, muscle_group_id, role"),
    getMuscleGroups(),
  ]);

  if (exercisesResult.error) throw exercisesResult.error;
  if (targetsResult.error) throw targetsResult.error;

  const muscleGroupNames = new Map(
    muscleGroups.map((muscleGroup) => [muscleGroup.id, muscleGroup.name]),
  );
  const targetsByExercise = new Map<string, ExerciseMuscleGroupRow[]>();

  for (const target of targetsResult.data) {
    const currentTargets = targetsByExercise.get(target.exercise_id) ?? [];
    currentTargets.push(target);
    targetsByExercise.set(target.exercise_id, currentTargets);
  }

  return exercisesResult.data.map((exercise) => {
    const targets = targetsByExercise.get(exercise.id) ?? [];
    const primaryTargets = targets.filter(
      (target) => target.role === "primary",
    );
    const secondaryTargets = targets.filter(
      (target) => target.role === "secondary",
    );

    return {
      ...exercise,
      primaryMuscleGroupIds: primaryTargets.map(
        (target) => target.muscle_group_id,
      ),
      secondaryMuscleGroupIds: secondaryTargets.map(
        (target) => target.muscle_group_id,
      ),
      primaryMuscleGroups: primaryTargets.map(
        (target) => muscleGroupNames.get(target.muscle_group_id) ?? "Unknown",
      ),
      secondaryMuscleGroups: secondaryTargets.map(
        (target) => muscleGroupNames.get(target.muscle_group_id) ?? "Unknown",
      ),
    };
  });
}
