import { getCharacterForProfileName, notificationVoices } from "./character-copy";

export type ProfileNotification =
  | { type: "exercise-library"; action: "added" | "updated"; name: string }
  | {
      type: "workout-routine";
      action:
        | "created"
        | "updated"
        | "archived"
        | "restored"
        | "deleted"
        | "archived-instead-of-deleted";
      name: string;
    }
  | {
      type: "workout";
      action: "started" | "completed" | "discarded";
      name?: string;
    }
  | {
      type: "session-exercise";
      action: "added" | "progress-saved" | "changes-saved" | "completed";
      name?: string;
    }
  | { type: "workout-history"; action: "updated" | "deleted"; name: string };

function getNotificationDetail(notification: ProfileNotification): string {
  switch (notification.type) {
    case "exercise-library":
      return notification.action === "added"
        ? `${notification.name} is now in the shared exercise library.`
        : `${notification.name} has been updated in the shared exercise library.`;
    case "workout-routine":
      switch (notification.action) {
        case "created":
          return `${notification.name} is ready as a new workout routine.`;
        case "updated":
          return `${notification.name} has been updated.`;
        case "archived":
          return `${notification.name} has been archived.`;
        case "restored":
          return `${notification.name} has been restored to your routines.`;
        case "deleted":
          return `${notification.name} has been removed from your routines.`;
        case "archived-instead-of-deleted":
          return `${notification.name} has been archived because it has completed workouts in your history.`;
      }
    case "workout":
      switch (notification.action) {
        case "started":
          return `${notification.name ?? "Your workout"} is underway.`;
        case "completed":
          return `${notification.name ?? "Your workout"} is complete and saved to your history.`;
        case "discarded":
          return `${notification.name ?? "Your workout"} has been discarded.`;
      }
    case "session-exercise":
      switch (notification.action) {
        case "added":
          return "An exercise has been added to this workout.";
        case "progress-saved":
          return notification.name
            ? `Your progress for ${notification.name} has been saved.`
            : "Your workout progress has been saved.";
        case "changes-saved":
          return `${notification.name ?? "Your exercise"} changes have been saved.`;
        case "completed":
          return `${notification.name ?? "The exercise"} is complete.`;
      }
    case "workout-history":
      return notification.action === "deleted"
        ? `${notification.name} has been removed from your workout history.`
        : `Changes to ${notification.name} have been saved.`;
  }
}

export function getProfileNotificationMessage(
  profileName: string,
  notification: ProfileNotification,
): string {
  const character = getCharacterForProfileName(profileName);
  const voice =
    (character ? notificationVoices[character] : null) ?? {
      opening: "Well done.",
      closing: "Keep building your training momentum.",
    };

  return `${voice.opening} ${getNotificationDetail(notification)} ${voice.closing}`;
}
