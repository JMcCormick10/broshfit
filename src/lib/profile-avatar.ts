import type { ProfileCharacter } from "./database.types";

export function getProfileAvatarUrl(
  character: ProfileCharacter | null,
): string | null {
  return character
    ? `${import.meta.env.BASE_URL}profile-avatars/${character}.svg`
    : null;
}
