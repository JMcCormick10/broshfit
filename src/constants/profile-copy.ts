import { getProgressMessage, type ProgressCharacter, type ProgressMood } from "./profile-copy/progress-messages";

export type ProfileCopy = {
  label: string;
  loginEyebrow: string;
  loginDescription: string;
  dashboardEyebrow: string;
  dashboardGreeting: string;
  dashboardPrompt: string;
  startWorkoutLabel: string;
  progressMessage: (progress: "up" | "down" | "steady" | "unknown", variant?: number) => string;
};

const defaultProfileCopy: ProfileCopy = {
  label: "TRAINING PROFILE",
  loginEyebrow: "Training log // profile access",
  loginDescription: "Sign in to continue to your training log.",
  dashboardEyebrow: "Strength training // dashboard",
  dashboardGreeting: "Welcome back.",
  dashboardPrompt: "Your next session starts here.",
  startWorkoutLabel: "Start New Workout",
  progressMessage: (progress) => progress === "up"
    ? "Your consistency is paying off. Keep building on this momentum."
    : progress === "down"
      ? "A dip is part of training. Reset, recover, and keep building."
      : progress === "steady"
        ? "You’re holding steady. Keep showing up and the next breakthrough will come."
        : "Log reps and weight across a couple of sessions to see how you’re trending.",
};

const profileCopyByName: Record<string, ProfileCopy> = {
  josh: {
    label: "SAIYAN // ALWAYS TRAINING",
    loginEyebrow: "Saiyan training // access",
    loginDescription: "Another day, another chance to get stronger. Sign in and get moving.",
    dashboardEyebrow: "Train hard // get stronger",
    dashboardGreeting: "Ready for another round, Goku?",
    dashboardPrompt: "Every session is a chance to go beyond yesterday.",
    startWorkoutLabel: "Start Training",
    progressMessage: (progress, variant) => getCharacterMessage("goku", progress, variant),
  },
  brad: {
    label: "PRINCE OF ALL SAIYANS",
    loginEyebrow: "Royal training // private access",
    loginDescription: "The throne won't claim itself. Sign in and take another step toward the top.",
    dashboardEyebrow: "No excuses // no equals",
    dashboardGreeting: "The top spot won't claim itself, Vegeta.",
    dashboardPrompt: "Set a new standard. Then raise it again.",
    startWorkoutLabel: "Chase the Crown",
    progressMessage: (progress, variant) => getCharacterMessage("vegeta", progress, variant),
  },
  test: {
    label: "CAPTAIN // GINYU FORCE",
    loginEyebrow: "Ginyu Force // member access",
    loginDescription: "The squad stays sharp through training. Sign in for your next mission.",
    dashboardEyebrow: "Mission briefing // combat readiness",
    dashboardGreeting: "Captain, your next mission awaits.",
    dashboardPrompt: "Keep the force ready, one session at a time.",
    startWorkoutLabel: "Begin Mission",
    progressMessage: (progress, variant) => getCharacterMessage("ginyu", progress, variant),
  },
};

function getCharacterMessage(character: ProgressCharacter, progress: "up" | "down" | "steady" | "unknown", variant = 0) {
  if (progress === "unknown") return defaultProfileCopy.progressMessage(progress);
  return getProgressMessage(character, progress as ProgressMood, variant);
}

export function getProfileCopy(profileName: string): ProfileCopy {
  return profileCopyByName[profileName.trim().toLowerCase()] ?? defaultProfileCopy;
}
