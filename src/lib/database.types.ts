export type ExerciseEquipment =
  | "Barbell"
  | "Dumbbell"
  | "Bodyweight"
  | "Cable"
  | "Machine"
  | "Kettlebell"
  | "Resistance Band"
  | "Other";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          label: string;
          detail: string;
          initial: string;
          accent: "orange" | "blue" | "muted";
          avatar_url: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          label: string;
          detail: string;
          initial: string;
          accent: "orange" | "blue" | "muted";
          avatar_url?: string | null;
          sort_order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          label?: string;
          detail?: string;
          initial?: string;
          accent?: "orange" | "blue" | "muted";
          avatar_url?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      muscle_groups: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order: number;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          name: string;
          equipment: ExerciseEquipment;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          equipment: ExerciseEquipment;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          equipment?: ExerciseEquipment;
          created_at?: string;
        };
        Relationships: [];
      };
      exercise_muscle_groups: {
        Row: {
          exercise_id: string;
          muscle_group_id: string;
          role: "primary" | "secondary";
        };
        Insert: {
          exercise_id: string;
          muscle_group_id: string;
          role: "primary" | "secondary";
        };
        Update: {
          exercise_id?: string;
          muscle_group_id?: string;
          role?: "primary" | "secondary";
        };
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      workout_exercises: {
        Row: {
          id: string;
          workout_id: string;
          exercise_id: string;
          position: number;
        };
        Insert: {
          id?: string;
          workout_id: string;
          exercise_id: string;
          position: number;
        };
        Update: {
          id?: string;
          workout_id?: string;
          exercise_id?: string;
          position?: number;
        };
        Relationships: [];
      };
      workout_sets: {
        Row: {
          workout_exercise_id: string;
          set_number: number;
          target_reps: string | null;
        };
        Insert: {
          workout_exercise_id: string;
          set_number: number;
          target_reps: string | null;
        };
        Update: {
          workout_exercise_id?: string;
          set_number?: number;
          target_reps?: string | null;
        };
        Relationships: [];
      };
      completed_workouts: {
        Row: {
          id: string;
          workout_id: string;
          completed_by: string;
          completed_at: string;
          session_id: string | null;
        };
        Insert: {
          id?: string;
          workout_id: string;
          completed_by?: string;
          completed_at?: string;
          session_id?: string | null;
        };
        Update: {
          id?: string;
          workout_id?: string;
          completed_by?: string;
          completed_at?: string;
          session_id?: string | null;
        };
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          id: string;
          workout_id: string;
          performed_by: string;
          status: "in_progress" | "completed";
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          workout_id: string;
          performed_by?: string;
          status?: "in_progress" | "completed";
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          workout_id?: string;
          performed_by?: string;
          status?: "in_progress" | "completed";
          started_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      workout_session_exercises: {
        Row: {
          id: string;
          session_id: string;
          source_workout_exercise_id: string | null;
          exercise_id: string;
          routine_position: number;
          prescribed_set_count: number;
          completed_order: number | null;
          completed_at: string | null;
          notes: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          source_workout_exercise_id?: string | null;
          exercise_id: string;
          routine_position: number;
          prescribed_set_count?: number;
          completed_order?: number | null;
          completed_at?: string | null;
          notes?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          source_workout_exercise_id?: string | null;
          exercise_id?: string;
          routine_position?: number;
          prescribed_set_count?: number;
          completed_order?: number | null;
          completed_at?: string | null;
          notes?: string;
        };
        Relationships: [];
      };
      workout_session_sets: {
        Row: {
          session_exercise_id: string;
          set_number: number;
          target_reps: string | null;
          actual_reps: number | null;
          actual_weight: number | null;
        };
        Insert: {
          session_exercise_id: string;
          set_number: number;
          target_reps?: string | null;
          actual_reps?: number | null;
          actual_weight?: number | null;
        };
        Update: {
          session_exercise_id?: string;
          set_number?: number;
          target_reps?: string | null;
          actual_reps?: number | null;
          actual_weight?: number | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_exercise: {
        Args: {
          exercise_name: string;
          exercise_equipment: ExerciseEquipment;
          primary_muscle_group_ids: string[];
          secondary_muscle_group_ids: string[];
        };
        Returns: string;
      };
      update_exercise: {
        Args: {
          target_exercise_id: string;
          exercise_name: string;
          exercise_equipment: ExerciseEquipment;
          primary_muscle_group_ids: string[];
          secondary_muscle_group_ids: string[];
        };
        Returns: string;
      };
      create_workout: {
        Args: {
          workout_name: string;
          workout_items: Json;
        };
        Returns: string;
      };
      update_workout: {
        Args: {
          target_workout_id: string;
          workout_name: string;
          workout_items: Json;
        };
        Returns: string;
      };
      archive_workout: {
        Args: {
          target_workout_id: string;
          should_archive: boolean;
        };
        Returns: boolean;
      };
      delete_workout: {
        Args: {
          target_workout_id: string;
        };
        Returns: boolean;
      };
      delete_completed_workout: {
        Args: {
          target_session_id: string;
        };
        Returns: undefined;
      };
      start_workout_session: {
        Args: {
          target_workout_id: string;
        };
        Returns: string;
      };
      save_workout_session_exercise: {
        Args: {
          target_session_exercise_id: string;
          set_updates: Json;
          exercise_notes: string;
        };
        Returns: undefined;
      };
      add_workout_session_set: {
        Args: {
          target_session_exercise_id: string;
        };
        Returns: number;
      };
      add_workout_session_exercise: {
        Args: {
          target_session_id: string;
          target_exercise_id: string;
        };
        Returns: string;
      };
      complete_workout_session_exercise: {
        Args: {
          target_session_exercise_id: string;
          set_updates: Json;
          exercise_notes: string;
          allow_incomplete?: boolean;
        };
        Returns: number;
      };
      finish_workout_session: {
        Args: {
          target_session_id: string;
          allow_incomplete?: boolean;
        };
        Returns: string;
      };
      discard_workout_session: {
        Args: {
          target_session_id: string;
        };
        Returns: string;
      };
      reorder_completed_workout_exercises: {
        Args: {
          target_session_id: string;
          ordered_completed_exercise_ids: string[];
        };
        Returns: undefined;
      };
      update_completed_workout_session: {
        Args: {
          target_session_id: string;
          completion_completed_at: string;
          exercise_updates: Json;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "name" | "label" | "detail" | "initial" | "accent" | "avatar_url"
>;
