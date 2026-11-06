import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getProfileNotificationMessage, type ProfileNotification } from "../../constants/profile-copy/notifications";
import { CharacterChat } from "../Molecules/CharacterChat";
import type { ProfileCharacter } from "../../lib/database.types";

type ToastProps = {
  durationMs?: number;
  notification: ProfileNotification;
  onDismiss: () => void;
  profileCharacter: ProfileCharacter | null;
};

export function Toast({
  durationMs = 4000,
  notification,
  onDismiss,
  profileCharacter,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const dismissRef = useRef(onDismiss);
  const message = getProfileNotificationMessage(
    profileCharacter,
    notification,
  );

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const showFrame = requestAnimationFrame(() => setIsVisible(true));
    const fadeTimer = setTimeout(() => setIsVisible(false), durationMs);
    const dismissTimer = setTimeout(
      () => dismissRef.current(),
      durationMs + 300,
    );

    return () => {
      cancelAnimationFrame(showFrame);
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [durationMs, message]);

  return createPortal(
    <div
      aria-live="polite"
      className={`fixed left-1/2 top-4 z-[70] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 rounded-lg border-2 border-secondary/70 bg-surface p-3 text-sm text-starlight shadow-2xl shadow-black/70 ring-1 ring-secondary/25 transition-all duration-300 sm:w-auto sm:min-w-80 ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      }`}
      role="status"
    >
      <CharacterChat
        ariaLabel="Character notification"
        label="Training update"
        message={message}
        profileCharacter={profileCharacter}
      />
    </div>,
    document.body,
  );
}
