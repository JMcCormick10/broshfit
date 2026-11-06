import type { ProfileCharacter } from "./database.types";

export type ProfileTheme = ProfileCharacter;

export function getProfileTheme(
  character: ProfileCharacter | null,
): ProfileTheme | null {
  return character;
}
