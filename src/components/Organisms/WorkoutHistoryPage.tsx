import { useState } from "react";
import { Button } from "../Atoms/Button";
import { Spinner } from "../Atoms/Spinner";
import { Toast } from "../Atoms/Toast";
import { CompletedWorkoutEditorDialog } from "./CompletedWorkoutEditorDialog";
import { WorkoutReportDialog } from "./WorkoutReportDialog";
import {
  getCompletedWorkoutHistory,
  type CompletedWorkoutSummary,
} from "../../lib/workouts";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { ProfileNotification } from "../../constants/profile-copy/notifications";

export function WorkoutHistoryPage({
  initialSelectedWorkout = null,
  onReportClosed,
  onViewLongTermTrends,
  profileName,
}: {
  initialSelectedWorkout?: CompletedWorkoutSummary | null;
  onReportClosed: () => void;
  onViewLongTermTrends: (
    exerciseId: string,
    workout: CompletedWorkoutSummary,
  ) => void;
  profileName: string;
}) {
  const [selectedWorkout, setSelectedWorkout] =
    useState<CompletedWorkoutSummary | null>(initialSelectedWorkout);
  const [isEditingSelectedWorkout, setIsEditingSelectedWorkout] =
    useState(false);
  const [notice, setNotice] = useState<ProfileNotification | null>(null);
  const {
    data: workouts,
    error: loadError,
    isLoading,
    reload: refreshHistory,
  } = useAsyncData(getCompletedWorkoutHistory, [], {
    errorMessage: "Could not load workout history.",
    initialData: [] as CompletedWorkoutSummary[],
  });

  return (
    <section aria-labelledby="workout-history-heading">
      <div className="border-b border-border pb-5">
        <p className="mb-2 font-mono text-[10px] font-bold tracking-[0.2em] text-accent uppercase">
          Training log // completed sessions
        </p>
        <h1
          id="workout-history-heading"
          className="font-heading text-4xl leading-none font-bold sm:text-5xl"
        >
          Workout History
        </h1>
      </div>

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Spinner label="Loading workout history..." />
        </div>
      ) : loadError ? (
        <p
          className="mt-6 rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm"
          role="alert"
        >
          Could not load workout history: {loadError}
        </p>
      ) : workouts.length === 0 ? (
        <p className="mt-6 border-y border-border py-8 text-sm text-muted-steel">
          No completed workouts yet.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border border-b border-border">
          {workouts.map((workout) => (
            <li key={workout.id}>
              <Button
                variant="menu-item"
                aria-label={`View report for ${workout.routineName}`}
                onClick={() => {
                  setSelectedWorkout(workout);
                  setIsEditingSelectedWorkout(false);
                }}
                type="button"
              >
                <span className="flex-1 text-left font-semibold">
                  {workout.routineName}
                </span>
                <time
                  className="font-mono text-xs text-muted-steel"
                  dateTime={workout.completedAt}
                >
                  {new Date(workout.completedAt).toLocaleDateString()}
                </time>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {selectedWorkout && !isEditingSelectedWorkout && (
        <WorkoutReportDialog
          onClose={() => {
            setSelectedWorkout(null);
            onReportClosed();
          }}
          onEditWorkout={() => setIsEditingSelectedWorkout(true)}
          onViewLongTermTrends={onViewLongTermTrends}
          profileName={profileName}
          workout={selectedWorkout}
        />
      )}
      {selectedWorkout && isEditingSelectedWorkout && (
        <CompletedWorkoutEditorDialog
          onClose={() => setIsEditingSelectedWorkout(false)}
          onSaved={async (action) => {
            await refreshHistory();
            setNotice({
              type: "workout-history",
              action: action === "deleted" ? "deleted" : "updated",
              name: selectedWorkout.routineName,
            });
            if (action === "deleted") {
              setSelectedWorkout(null);
              onReportClosed();
            }
          }}
          workout={selectedWorkout}
        />
      )}
      {notice && (
        <Toast
          notification={notice}
          onDismiss={() => setNotice(null)}
          profileName={profileName}
        />
      )}
    </section>
  );
}
