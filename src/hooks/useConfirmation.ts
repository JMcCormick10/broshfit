import { useState } from "react";

export type PendingConfirmation = {
  confirmLabel: string;
  description: string;
  onConfirm: () => Promise<void>;
  title: string;
};

export function useConfirmation() {
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(
    null,
  );

  return {
    confirmation,
    clearConfirmation: () => setConfirmation(null),
    requestConfirmation: setConfirmation,
  };
}
