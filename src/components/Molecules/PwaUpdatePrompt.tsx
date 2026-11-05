import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "../Atoms/Button";

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error("Service worker registration failed:", error);
    },
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  async function applyUpdate() {
    setIsUpdating(true);
    setUpdateError(null);

    try {
      await updateServiceWorker(true);
    } catch (error) {
      console.error("Failed to apply service worker update:", error);
      setUpdateError("The update could not be installed. Please try again.");
      setIsUpdating(false);
    }
  }

  if (!needRefresh) return null;

  return (
    <aside
      aria-label="App update available"
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-lg flex-col gap-3 rounded-xl border border-secondary/70 bg-surface p-4 text-starlight shadow-2xl shadow-black/70 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold">Update available</h2>
          <p className="mt-1 text-sm text-muted-steel" role="status" aria-live="polite">
            A new version of Zenkai Boost is ready. Update now to reload the app.
          </p>
          {updateError && (
            <p className="mt-2 text-sm text-danger" role="alert">
              {updateError}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            disabled={isUpdating}
            onClick={() => setNeedRefresh(false)}
            variant="outline"
          >
            Later
          </Button>
          <Button
            disabled={isUpdating}
            onClick={() => void applyUpdate()}
            variant="primary"
          >
            {isUpdating ? "Updating..." : "Update now"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
