import { workoutMotivation } from "./character-copy";
import type { ProgressCharacter } from "./character-copy";

export function getWorkoutMotivation(character: ProgressCharacter, sessionId: string): string {
  const index = [...sessionId].reduce((hash, characterCode) => (hash * 31 + characterCode.charCodeAt(0)) >>> 0, 17) % workoutMotivation[character].length;
  return workoutMotivation[character][index];
}
