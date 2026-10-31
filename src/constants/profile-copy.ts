import {
  characterProfileText,
  exerciseHistoryVoices,
  getCharacterForProfileName,
} from "./profile-copy/character-copy";
import {
  getProgressMessage,
  type ProgressCharacter,
  type ProgressMood,
} from "./profile-copy/progress-messages";
import { getWorkoutMotivation } from "./profile-copy/workout-motivation";

export type ProfileCopy = {
  label: string;
  loginEyebrow: string;
  loginDescription: string;
  dashboardEyebrow: string;
  dashboardGreeting: string;
  dashboardPrompt: string;
  startWorkoutLabel: string;
  progressMessage: (
    progress: "up" | "down" | "steady" | "mixed" | "unknown",
    variant?: number,
  ) => string;
  workoutMotivation: (sessionId: string) => string;
};

const defaultProfileCopy: ProfileCopy = {
  label: "TRAINING PROFILE",
  loginEyebrow: "Training log // profile access",
  loginDescription: "Sign in to continue to your training log.",
  dashboardEyebrow: "Strength training // dashboard",
  dashboardGreeting: "Welcome back.",
  dashboardPrompt: "Your next session starts here.",
  startWorkoutLabel: "Start New Workout",
  progressMessage: (progress) =>
    progress === "up"
      ? "Your progress signals are moving in a positive direction. Keep building on this momentum."
      : progress === "down"
        ? "This comparison points down, but one stretch doesn’t define your progress. Reset and keep building."
        : progress === "mixed"
          ? "Strength, load, and total work moved in different directions. That’s a mixed signal, not a verdict."
          : progress === "steady"
            ? "You’re holding steady. Keep showing up and the next breakthrough will come."
            : "Log reps and weight across a couple of sessions to see how you’re trending.",
  workoutMotivation: () =>
    "Take it one set at a time. Show up, focus on good form, and do your best.",
};

function getCharacterMessage(
  character: ProgressCharacter,
  progress: ProgressMood | "unknown",
  variant = 0,
) {
  if (progress === "unknown") {
    return defaultProfileCopy.progressMessage(progress);
  }
  return getProgressMessage(character, progress, variant);
}

export function getProfileCopy(profileName: string): ProfileCopy {
  const character = getCharacterForProfileName(profileName);
  if (!character) return defaultProfileCopy;

  return {
    ...characterProfileText[character],
    progressMessage: (progress, variant) =>
      getCharacterMessage(character, progress, variant),
    workoutMotivation: (sessionId) =>
      getWorkoutMotivation(character, sessionId),
  };
}

export function getExerciseHistoryContextMessage(
  profileName: string,
  contextSentences: string[],
): string {
  const character = getCharacterForProfileName(profileName);
  const voice = character ? exerciseHistoryVoices[character] : null;
  const opening = voice?.opening ?? "Here's a quick look at your last session:";
  const context = contextSentences.join(" ");

  return context
    ? `${opening} ${context} ${voice?.closing ?? ""}`.trim()
    : opening;
}
