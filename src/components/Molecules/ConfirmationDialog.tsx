import { useState } from "react";
import { Button } from "../Atoms/Button";
import { DialogShell } from "./DialogShell";

type ConfirmationDialogProps = {
  confirmLabel: string;
  danger?: boolean;
  description: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  title: string;
};

export function ConfirmationDialog({
  confirmLabel,
  danger = false,
  description,
  onCancel,
  onConfirm,
  title,
}: ConfirmationDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setIsConfirming(true);
    setError(null);

    try {
      await onConfirm();
      onCancel();
    } catch (confirmError: unknown) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "The requested action could not be completed.",
      );
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <DialogShell
      closeDisabled={isConfirming}
      closeLabel="Close confirmation"
      description={description}
      eyebrow="Workout // confirm action"
      onClose={onCancel}
      title={title}
      titleId="workout-confirmation-heading"
      widthClass="max-w-md"
      className="p-6 sm:p-8"
    >
      {error && (
        <p
          className="mb-4 rounded-md border border-danger/40 bg-danger/5 px-3 py-2.5 text-sm"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button
          variant="outline"
          disabled={isConfirming}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          disabled={isConfirming}
          onClick={() => void confirm()}
          type="button"
        >
          {isConfirming ? "Working..." : confirmLabel}
        </Button>
      </div>
    </DialogShell>
  );
}
