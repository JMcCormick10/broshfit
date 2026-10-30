const avatarFiles: Record<string, string> = {
  josh: "josh.svg",
  brad: "brad.svg",
  test: "test.svg",
};

export function getProfileAvatarUrl(profileName: string): string | null {
  const avatarFile = avatarFiles[profileName.trim().toLowerCase()];
  return avatarFile
    ? `${import.meta.env.BASE_URL}profile-avatars/${avatarFile}`
    : null;
}
