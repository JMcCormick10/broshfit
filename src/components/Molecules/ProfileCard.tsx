import type { Profile } from "../../lib/database.types";
import { getProfileCopy } from "../../constants/profile-copy";
import { getProfileAvatarUrl } from "../../lib/profile-avatar";
import { Button } from "../Atoms/Button";

const accentClasses: Record<Profile["accent"], string> = {
  orange: "text-primary",
  blue: "text-secondary",
  muted: "text-muted-steel",
};

type ProfileCardProps = {
  isSelected: boolean;
  onSelect: (profile: Profile) => void;
  profile: Profile;
};

export function ProfileCard({
  isSelected,
  onSelect,
  profile,
}: ProfileCardProps) {
  const avatarUrl = getProfileAvatarUrl(profile.name);
  const profileCopy = getProfileCopy(profile.name);

  return (
    <Button
      variant="profile"
      selected={isSelected}
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(profile)}
    >
      <span
        className={`flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-current/25 bg-surface ${accentClasses[profile.accent]}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="font-heading text-2xl font-bold">
            {profile.initial}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-heading text-xl font-bold">{profile.name}</span>
        <span className="mt-0.5 block font-mono text-[9px] tracking-[0.12em] text-muted-steel">
          {profileCopy.label}
        </span>
      </span>
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-primary bg-primary text-void" : "border-border text-transparent group-hover:border-secondary"}`}
        aria-hidden="true"
      >
        {isSelected ? "✓" : ""}
      </span>
    </Button>
  );
}
