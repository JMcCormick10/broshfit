import { Button } from "../Atoms/Button";

export type SetTarget = {
  reps: string | null;
};

type RepRangeValues = {
  minimum: string;
  maximum: string;
};

type SetRepEditorProps = {
  exerciseName: string;
  entryKey: string;
  onAddSet: () => void;
  onChange: (setIndex: number, value: string) => void;
  onRemoveSet: (setIndex: number) => void;
  targetSets: SetTarget[];
};

function getRepRangeValues(value: string | null): RepRangeValues {
  const match = value?.trim().match(/^(\d+)(?:\s*[-–—]\s*(\d+))?$/);
  if (!match) return { minimum: "", maximum: "" };

  return {
    minimum: match[1],
    maximum: match[2] ?? match[1],
  };
}

function formatRepRange(minimum: string, maximum: string): string {
  const resolvedMinimum = minimum || maximum;
  const resolvedMaximum = maximum || resolvedMinimum;
  return resolvedMinimum === resolvedMaximum
    ? resolvedMinimum
    : `${resolvedMinimum}-${resolvedMaximum}`;
}

export function SetRepEditor({
  exerciseName,
  entryKey,
  onAddSet,
  onChange,
  onRemoveSet,
  targetSets,
}: SetRepEditorProps) {
  return (
    <div className="mt-3 grid gap-3 pl-8 sm:grid-cols-2">
      {targetSets.map((targetSet, setIndex) => {
        const range = getRepRangeValues(targetSet.reps);

        return (
          <div
            className="flex items-end gap-3 rounded-md border border-border/70 px-3 py-2"
            key={`${entryKey}-set-${setIndex}`}
          >
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
              <span className="col-span-2 text-[10px] font-semibold text-muted-steel">
                Set {setIndex + 1} · suggested rep range
              </span>
              <label className="flex min-w-0 flex-col gap-1 text-[10px] text-muted-steel">
                <span>Minimum reps</span>
                <input
                  aria-label={`${exerciseName} set ${setIndex + 1} minimum suggested reps`}
                  className="min-w-0 rounded border border-border bg-void px-2 py-1.5 text-sm text-starlight outline-none focus:border-secondary"
                  min="1"
                  onChange={(event) => {
                    const minimum = event.target.value;
                    if (!minimum) {
                      onChange(setIndex, "");
                      return;
                    }
                    const maximum =
                      !range.maximum ||
                      range.maximum === range.minimum ||
                      Number(range.maximum) < Number(minimum)
                        ? minimum
                        : range.maximum;
                    onChange(setIndex, formatRepRange(minimum, maximum));
                  }}
                  placeholder="Optional"
                  step="1"
                  type="number"
                  value={range.minimum}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-[10px] text-muted-steel">
                <span>Maximum reps</span>
                <input
                  aria-label={`${exerciseName} set ${setIndex + 1} maximum suggested reps`}
                  className="min-w-0 rounded border border-border bg-void px-2 py-1.5 text-sm text-starlight outline-none focus:border-secondary"
                  min={range.minimum || "1"}
                  onChange={(event) => {
                    const maximum = event.target.value;
                    const minimum = range.minimum || maximum;
                    onChange(
                      setIndex,
                      formatRepRange(minimum, maximum || minimum),
                    );
                  }}
                  placeholder="Optional"
                  step="1"
                  type="number"
                  value={range.maximum}
                />
              </label>
            </div>
            {targetSets.length > 1 && (
              <Button
                variant="inline-danger"
                aria-label={`Remove set ${setIndex + 1}`}
                onClick={() => onRemoveSet(setIndex)}
                type="button"
              >
                ×
              </Button>
            )}
          </div>
        );
      })}
      <Button
        variant="small-action"
        disabled={targetSets.length >= 30}
        onClick={onAddSet}
        type="button"
      >
        + Set
      </Button>
    </div>
  );
}
