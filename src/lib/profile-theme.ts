export type ProfileTheme = "goku" | "vegeta" | "ginyu";

const profileThemes: Record<string, ProfileTheme> = {
  josh: "goku",
  brad: "vegeta",
  test: "ginyu",
};

export function getProfileTheme(profileName: string): ProfileTheme | null {
  return profileThemes[profileName.trim().toLowerCase()] ?? null;
}
