import { useEffect, useRef, useState } from "react";

type UseAsyncDataOptions<T> = {
  errorMessage: string;
  initialData: T;
  onLoaded?: (data: T) => void;
};

export function useAsyncData<T>(
  load: () => Promise<T>,
  dependencies: readonly unknown[],
  { errorMessage, initialData, onLoaded }: UseAsyncDataOptions<T>,
) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;

  // oxlint-disable-next-line react-hooks/exhaustive-deps -- callers own the dependency list
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    loadRef
      .current()
      .then((result) => {
        if (isMounted) {
          setData(result);
          setError(null);
          onLoaded?.(result);
        }
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setError(
            loadError instanceof Error ? loadError.message : errorMessage,
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- callers own the dependency list
  }, dependencies);

  async function reload() {
    setIsLoading(true);
    try {
      const result = await loadRef.current();
      setData(result);
      setError(null);
      onLoaded?.(result);
    } catch (reloadError: unknown) {
      setError(
        reloadError instanceof Error ? reloadError.message : errorMessage,
      );
    } finally {
      setIsLoading(false);
    }
  }

  return { data, error, isLoading, reload, setData };
}
