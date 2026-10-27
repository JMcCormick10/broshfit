import { Button } from "../Atoms/Button";

export type SetTarget = {
  reps: string | null;
};

type SetRepEditorProps = {
  exerciseName: string;
  entryKey: string;
  onAddSet: () => void;
  onChange: (setIndex: number, value: string) => void;
  onRemoveSet: (setIndex: number) => void;
  targetSets: SetTarget[];
};

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
      {targetSets.map((targetSet, setIndex) => (
        <div
          className="flex items-end gap-3 rounded-md border border-border/70 px-3 py-2"
          key={`${entryKey}-set-${setIndex}`}
        >
          <label className="flex flex-1 flex-col gap-1 text-[10px] text-muted-steel">
            <span>Set {setIndex + 1} · reps</span>
            <input
              aria-label={`${exerciseName} set ${setIndex + 1} suggested reps`}
              className="min-w-0 rounded border border-border bg-void px-2 py-1.5 text-sm text-starlight outline-none focus:border-secondary"
              onChange={(event) => onChange(setIndex, event.target.value)}
              placeholder="Optional"
              type="text"
              value={targetSet.reps ?? ""}
            />
          </label>
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
      ))}
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
