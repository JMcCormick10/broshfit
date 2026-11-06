import { getProfileAvatarUrl } from "../../lib/profile-avatar";
import type { ProfileCharacter } from "../../lib/database.types";

type CharacterChatProps = {
  ariaLabel?: string;
  label?: string;
  message: string;
  profileCharacter: ProfileCharacter | null;
};

export function CharacterChat({
  ariaLabel = "Character progress message",
  label = "Training partner",
  profileCharacter,
  message,
}: CharacterChatProps) {
  const avatarUrl = getProfileAvatarUrl(profileCharacter);
  return (
    <aside
      aria-label={ariaLabel}
      className="flex items-end gap-3 sm:gap-4"
    >
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/60 bg-surface shadow-[0_0_18px_color-mix(in_srgb,var(--primary)_20%,transparent)] sm:size-16">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={profileCharacter ?? "Training character"}
            className="size-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="font-heading text-2xl font-bold text-primary"
          >
            {profileCharacter?.charAt(0).toUpperCase() ?? "?"}
          </span>
        )}
      </div>
      <div className="relative mb-1 flex-1 rounded-2xl rounded-bl-sm border border-primary/35 bg-surface px-4 py-3 shadow-lg shadow-black/20 sm:px-5 sm:py-4">
        <span
          aria-hidden="true"
          className="absolute -left-2 bottom-3 size-3 rotate-45 border-b border-l border-primary/35 bg-surface"
        />
        <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.18em] text-secondary">
          {label}
        </p>
        <p className="text-sm leading-relaxed text-starlight">“{message}”</p>
      </div>
    </aside>
  );
}
