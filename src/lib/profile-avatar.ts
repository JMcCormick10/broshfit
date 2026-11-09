import type { ProfileCharacter } from "./database.types";

const avatarFiles: Record<ProfileCharacter, string> = {
  goku: "goku.svg",
  vegeta: "vegeta.svg",
  ginyu: "ginyu.svg",
  piccolo: "piccolo.svg",
};

export function getProfileAvatarUrl(
  character: ProfileCharacter | null,
): string | null {
  const avatarFile = character ? avatarFiles[character] : null;
  return avatarFile
    ? `${import.meta.env.BASE_URL}profile-avatars/${avatarFile}`
    : null;
}
