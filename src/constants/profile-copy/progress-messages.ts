import { progressMessages } from "./character-copy";
import type { ProgressCharacter, ProgressMood } from "./character-copy";

export type { ProgressCharacter, ProgressMood } from "./character-copy";

export function getProgressMessage(
  character: ProgressCharacter,
  mood: ProgressMood,
  variant = 0,
): string {
  const options = progressMessages[character][mood];
  return options[
    ((Math.trunc(variant) % options.length) + options.length) % options.length
  ];
}
