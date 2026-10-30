import { useEffect, useState } from "react";
import type { Profile } from "../../lib/database.types";
import { Button } from "../Atoms/Button";
import { ExerciseLibrary } from "./ExerciseLibrary";
import type { ExerciseRecord } from "../../lib/exercises";
import { AddExerciseDialog } from "./AddExerciseDialog";
import { WorkoutBuilderDialog } from "./WorkoutBuilderDialog";
import { WorkoutRoutinesDashboard } from "./WorkoutRoutinesDashboard";
import {
  getActiveWorkoutSession,
  getCompletedWorkoutHistory,
  startWorkoutSession,
  type CompletedWorkoutSummary,
  type WorkoutSession,
  type WorkoutRoutine,
} from "../../lib/workouts";
import { Spinner } from "../Atoms/Spinner";
import { WorkoutRoutinePickerDialog } from "./WorkoutRoutinePickerDialog";
import { ActiveWorkoutDashboard } from "./ActiveWorkoutDashboard";
import { WorkoutHistoryPage } from "./WorkoutHistoryPage";
import { CompletedWorkoutEditorDialog } from "./CompletedWorkoutEditorDialog";
import { useAsyncData } from "../../hooks/useAsyncData";
import { Toast } from "../Atoms/Toast";
import { getProfileAvatarUrl } from "../../lib/profile-avatar";
import { getProfileTheme } from "../../lib/profile-theme";
import { getProfileCopy } from "../../constants/profile-copy";
import { ExerciseProgressPage } from "./ExerciseProgressPage";

type ProfileLandingPageProps = {
  isSigningOut: boolean;
  logoutError: string | null;
  onLogout: () => void;
  profile: Profile;
};

export function ProfileLandingPage({
  isSigningOut,
  logoutError,
  onLogout,
  profile,
}: ProfileLandingPageProps) {
  const [activeView, setActiveView] = useState<
    "dashboard" | "exercises" | "workout-routines" | "workout-history" | "progress"
  >("dashboard");
  const profileAvatarUrl = getProfileAvatarUrl(profile.name);
  const profileTheme = getProfileTheme(profile.name);
  const profileCopy = getProfileCopy(profile.name);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [isWorkoutDialogOpen, setIsWorkoutDialogOpen] = useState(false);
  const [isRoutinePickerOpen, setIsRoutinePickerOpen] = useState(false);
  const [workoutToEdit, setWorkoutToEdit] = useState<WorkoutRoutine | null>(
    null,
  );
  const [exerciseToEdit, setExerciseToEdit] = useState<ExerciseRecord | null>(
    null,
  );
  const [exerciseListVersion, setExerciseListVersion] = useState(0);
  const [workoutListVersion, setWorkoutListVersion] = useState(0);
  const [exerciseNotice, setExerciseNotice] = useState<string | null>(null);
  const {
    data: recentWorkouts,
    error: recentWorkoutError,
    isLoading: isLoadingRecentWorkouts,
    reload: refreshRecentWorkouts,
  } = useAsyncData(() => getCompletedWorkoutHistory(5), [], {
    errorMessage: "Could not load workout history.",
    initialData: [] as CompletedWorkoutSummary[],
  });
  const [activeWorkoutSession, setActiveWorkoutSession] =
    useState<WorkoutSession | null>(null);
  const [isLoadingActiveWorkout, setIsLoadingActiveWorkout] = useState(true);
  const [activeWorkoutError, setActiveWorkoutError] = useState<string | null>(
    null,
  );
  const [completedWorkoutToEdit, setCompletedWorkoutToEdit] =
    useState<CompletedWorkoutSummary | null>(null);

  useEffect(() => {
    const root = document.documentElement;

    if (profileTheme) {
      root.dataset.theme = profileTheme;
    } else {
      delete root.dataset.theme;
    }

    return () => {
      delete root.dataset.theme;
    };
  }, [profileTheme]);

  useEffect(() => {
    let isMounted = true;

    getActiveWorkoutSession()
      .then((session) => {
        if (isMounted) setActiveWorkoutSession(session);
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setActiveWorkoutError(
            error instanceof Error
              ? error.message
              : "Could not restore the active workout.",
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingActiveWorkout(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function openCreateDialog() {
    setExerciseToEdit(null);
    setIsExerciseDialogOpen(true);
  }

  function openEditDialog(exercise: ExerciseRecord) {
    setExerciseToEdit(exercise);
    setIsExerciseDialogOpen(true);
  }

  function closeExerciseDialog() {
    setIsExerciseDialogOpen(false);
    setExerciseToEdit(null);
  }

  function handleExerciseSaved(
    name: string,
    _exerciseId: string,
    wasEdited: boolean,
  ) {
    setExerciseNotice(
      `${wasEdited ? "Updated" : "Added"} ${name} in the shared exercise library.`,
    );
    setExerciseListVersion((version) => version + 1);
  }

  function openCreateWorkoutDialog() {
    setWorkoutToEdit(null);
    setIsWorkoutDialogOpen(true);
  }

  function openEditWorkoutDialog(routine: WorkoutRoutine) {
    setWorkoutToEdit(routine);
    setIsWorkoutDialogOpen(true);
  }

  function closeWorkoutDialog() {
    setIsWorkoutDialogOpen(false);
    setWorkoutToEdit(null);
  }

  function handleWorkoutSaved(name: string, wasEdited: boolean) {
    setExerciseNotice(
      `${wasEdited ? "Updated" : "Created"} workout routine: ${name}.`,
    );
    setWorkoutListVersion((version) => version + 1);
  }

  function handleWorkoutChanged(message: string) {
    setExerciseNotice(message);
    setWorkoutListVersion((version) => version + 1);
  }

  async function handleStartWorkout(routineId: string) {
    const session = await startWorkoutSession(routineId);
    setActiveWorkoutSession(session);
    setIsRoutinePickerOpen(false);
    setActiveWorkoutError(null);
    setExerciseNotice(`Started workout: ${session.routineName}.`);
  }

  function handleWorkoutSessionChange(session: WorkoutSession) {
    setActiveWorkoutSession(session);
  }

  function handleWorkoutSessionFinished(routineName: string) {
    setActiveWorkoutSession(null);
    setExerciseNotice(`${routineName} completed and added to workout history.`);
    refreshRecentWorkouts();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-transparent text-starlight">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 84% 0%, rgba(53,184,255,.1), transparent 36%), linear-gradient(rgba(247,244,237,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(247,244,237,.025) 1px, transparent 1px)",
          backgroundSize: "auto, 56px 56px, 56px 56px",
          maskImage: "linear-gradient(to bottom, black, transparent 72%)",
        }}
      />

      <header className="relative z-30 border-b border-border/70 bg-void/80">
        <div className="page-container page-gutter flex items-center justify-between gap-4 py-4">
          <button
            type="button"
            onClick={() => {
              setExerciseNotice(null);
              setActiveView("dashboard");
            }}
            aria-label="Go to dashboard"
            className="font-heading text-lg font-bold tracking-[0.18em] transition hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            BROSHFIT
          </button>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-10 items-center justify-center overflow-hidden rounded-md border border-accent/50 bg-surface font-heading text-lg font-bold text-accent">
                {profileAvatarUrl ? (
                  <img
                    src={profileAvatarUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  profile.initial
                )}
              </span>
              <span className="hidden sm:block">
                <span className="block font-semibold leading-tight">
                  {profile.name}
                </span>
                <span className="font-mono text-[9px] tracking-[0.12em] text-muted-steel">
                  {profileCopy.label}
                </span>
              </span>
            </div>
            <div className="relative">
              <Button
                variant="menu-toggle"
                aria-controls="profile-navigation"
                aria-expanded={isMenuOpen}
                aria-label={
                  isMenuOpen ? "Close navigation menu" : "Open navigation menu"
                }
                onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
                type="button"
              >
                <span aria-hidden="true" className="h-0.5 w-4 bg-starlight" />
                <span aria-hidden="true" className="h-0.5 w-4 bg-starlight" />
                <span aria-hidden="true" className="h-0.5 w-4 bg-starlight" />
              </Button>
              {isMenuOpen && (
                <nav
                  aria-label="Profile navigation"
                  className="absolute right-0 top-full z-40 mt-2 w-52 rounded-md border border-border bg-surface p-1 shadow-xl shadow-black/40"
                  id="profile-navigation"
                >
                  <Button
                    variant="menu-item"
                    onClick={() => {
                      setActiveView("dashboard");
                      setIsMenuOpen(false);
                    }}
                    type="button"
                  >
                    Dashboard
                  </Button>
                  <Button
                    variant="menu-item"
                    onClick={() => {
                      setExerciseNotice(null);
                      setActiveView("exercises");
                      setIsMenuOpen(false);
                    }}
                    type="button"
                  >
                    Exercises
                  </Button>
                  <Button
                    variant="menu-item"
                    onClick={() => {
                      setExerciseNotice(null);
                      setActiveView("workout-routines");
                      setIsMenuOpen(false);
                    }}
                    type="button"
                  >
                    View Workout Routines
                  </Button>
                  <Button
                    variant="menu-item"
                    onClick={() => {
                      setExerciseNotice(null);
                      setActiveView("workout-history");
                      setIsMenuOpen(false);
                    }}
                    type="button"
                  >
                    Workout History
                  </Button>
                  <Button
                    variant="menu-item"
                    onClick={() => {
                      setExerciseNotice(null);
                      setActiveView("progress");
                      setIsMenuOpen(false);
                    }}
                    type="button"
                  >
                    View Progress
                  </Button>
                  <div className="my-1 border-t border-border" />
                  <Button
                    variant="menu-item-muted"
                    disabled={isSigningOut}
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout();
                    }}
                    type="button"
                  >
                    {isSigningOut ? "Signing out..." : "Log Out"}
                  </Button>
                </nav>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className={`page-container page-gutter relative z-10 pb-16 ${activeView === "progress" ? "pt-6 sm:pt-8" : "pt-10 sm:pt-14"}`}>
        {activeView !== "dashboard" && activeView !== "progress" && (
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={() => {
                setExerciseNotice(null);
                setActiveView("dashboard");
              }}
              type="button"
            >
              ← Back to Dashboard
            </Button>
          </div>
        )}

        {logoutError && (
          <p
            className="mb-6 rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-starlight"
            role="alert"
          >
            {logoutError}
          </p>
        )}

        {activeView === "dashboard" ? (
          isLoadingActiveWorkout ? (
            <div className="flex min-h-48 items-center justify-center">
              <Spinner label="Checking for an active workout..." />
            </div>
          ) : activeWorkoutError ? (
            <p
              className="rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm"
              role="alert"
            >
              Could not check for an active workout: {activeWorkoutError}
            </p>
          ) : activeWorkoutSession ? (
            <ActiveWorkoutDashboard
              onDiscard={() => {
                setActiveWorkoutSession(null);
                setExerciseNotice("Workout discarded.");
              }}
              onFinish={handleWorkoutSessionFinished}
              onSessionChange={handleWorkoutSessionChange}
              session={activeWorkoutSession}
            />
          ) : (
            <>
              <section aria-labelledby="dashboard-heading">
                <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.2em] text-accent uppercase">
                  {profileCopy.dashboardEyebrow}
                </p>
                <h1
                  id="dashboard-heading"
                  className="font-heading text-4xl leading-none font-bold sm:text-5xl"
                >
                  {profileCopy.dashboardGreeting}
                </h1>
                <p className="mt-3 text-sm text-muted-steel">
                  {profileCopy.dashboardPrompt}
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <Button
                    variant="dashboard-primary"
                    onClick={() => setIsRoutinePickerOpen(true)}
                    type="button"
                  >
                    <span>{profileCopy.startWorkoutLabel}</span>
                    <span aria-hidden="true" className="text-2xl leading-none">
                      +
                    </span>
                  </Button>
                  <div className="grid gap-3">
                    <Button
                      variant="dashboard-secondary"
                      onClick={() => {
                        setExerciseNotice(null);
                        openCreateDialog();
                      }}
                      type="button"
                    >
                      <span>Add New Exercise</span>
                      <span
                        aria-hidden="true"
                        className="text-2xl leading-none text-secondary"
                      >
                        +
                      </span>
                    </Button>
                    <Button
                      variant="dashboard-routine"
                      onClick={() => {
                        setExerciseNotice(null);
                        openCreateWorkoutDialog();
                      }}
                      type="button"
                    >
                      <span>Add New Workout Routine</span>
                      <span
                        aria-hidden="true"
                        className="text-2xl leading-none text-primary"
                      >
                        +
                      </span>
                    </Button>
                  </div>
                </div>
              </section>
              <section aria-labelledby="last-workout-heading" className="mt-12">
                <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                  <h2
                    id="last-workout-heading"
                    className="font-heading text-2xl font-bold sm:text-3xl"
                  >
                    Recent Workouts
                  </h2>
                  {recentWorkouts.length > 0 && (
                    <Button
                      variant="outline-small"
                      onClick={() => setActiveView("workout-history")}
                      type="button"
                    >
                      View More
                    </Button>
                  )}
                </div>
                {isLoadingRecentWorkouts ? (
                  <div className="flex min-h-24 items-center">
                    <Spinner compact label="Loading workout history..." />
                  </div>
                ) : recentWorkoutError ? (
                  <p
                    className="border-b border-border py-5 text-sm text-danger"
                    role="alert"
                  >
                    Could not load workout history: {recentWorkoutError}
                  </p>
                ) : recentWorkouts.length > 0 ? (
                  <ul className="divide-y divide-border border-b border-border">
                    {recentWorkouts.map((workout) => (
                      <li key={workout.id}>
                        <Button
                          variant="menu-item"
                          aria-label={`Edit ${workout.routineName}`}
                          onClick={() => setCompletedWorkoutToEdit(workout)}
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
                ) : (
                  <p className="border-b border-border py-5 text-sm text-muted-steel">
                    No past workouts yet.
                  </p>
                )}
              </section>
            </>
          )
        ) : activeView === "exercises" ? (
          <ExerciseLibrary
            onAdd={openCreateDialog}
            onEdit={openEditDialog}
            refreshKey={exerciseListVersion}
          />
        ) : activeView === "workout-routines" ? (
          <WorkoutRoutinesDashboard
            onAdd={openCreateWorkoutDialog}
            onChanged={handleWorkoutChanged}
            onEdit={openEditWorkoutDialog}
            refreshKey={workoutListVersion}
          />
        ) : activeView === "workout-history" ? (
          <WorkoutHistoryPage />
        ) : (
          <ExerciseProgressPage profileCopy={profileCopy} profileName={profile.name} />
        )}
      </div>
      {isExerciseDialogOpen && (
        <AddExerciseDialog
          exercise={exerciseToEdit ?? undefined}
          onClose={closeExerciseDialog}
          onSaved={handleExerciseSaved}
        />
      )}
      {isWorkoutDialogOpen && (
        <WorkoutBuilderDialog
          onClose={closeWorkoutDialog}
          onSaved={handleWorkoutSaved}
          routine={workoutToEdit ?? undefined}
        />
      )}
      {isRoutinePickerOpen && (
        <WorkoutRoutinePickerDialog
          onClose={() => setIsRoutinePickerOpen(false)}
          onStart={handleStartWorkout}
        />
      )}
      {completedWorkoutToEdit && (
        <CompletedWorkoutEditorDialog
          onClose={() => setCompletedWorkoutToEdit(null)}
          onSaved={async (action) => {
            await refreshRecentWorkouts();
            setExerciseNotice(
              action === "deleted"
                ? `${completedWorkoutToEdit.routineName} deleted from workout history.`
                : `${completedWorkoutToEdit.routineName} changes saved.`,
            );
          }}
          workout={completedWorkoutToEdit}
        />
      )}
      {exerciseNotice && (
        <Toast
          message={exerciseNotice}
          onDismiss={() => setExerciseNotice(null)}
        />
      )}
    </main>
  );
}
