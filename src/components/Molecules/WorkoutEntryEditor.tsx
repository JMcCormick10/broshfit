import type { PointerEventHandler } from "react";
import type { WorkoutExerciseInput } from "../../lib/workouts";
import { Button } from "../Atoms/Button";
import { SetRepEditor } from "./SetRepEditor";

type WorkoutEntryEditorProps = {
  dropPosition: "before" | "after" | null;
  entry: WorkoutExerciseInput & { key: string };
  entryIndex: number;
  exerciseName: string;
  equipment: string;
  isDragging: boolean;
  onAddSet: () => void;
  onChangeSet: (setIndex: number, value: string) => void;
  onMove: (offset: -1 | 1) => void;
  onPointerCancel: PointerEventHandler<HTMLButtonElement>;
  onPointerDown: PointerEventHandler<HTMLButtonElement>;
  onPointerMove: PointerEventHandler<HTMLButtonElement>;
  onPointerUp: PointerEventHandler<HTMLButtonElement>;
  onRemove: () => void;
  onRemoveSet: (setIndex: number) => void;
  totalEntries: number;
};

export function WorkoutEntryEditor({
  dropPosition,
  entry,
  entryIndex,
  exerciseName,
  equipment,
  isDragging,
  onAddSet,
  onChangeSet,
  onMove,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onRemove,
  onRemoveSet,
  totalEntries,
}: WorkoutEntryEditorProps) {
  return (
    <li
      className={`py-4 transition ${isDragging ? "opacity-50" : ""} ${dropPosition ? "rounded ring-1 ring-secondary/60" : ""}`}
      data-workout-entry={entry.key}
      aria-roledescription="draggable exercise item"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Button
              variant="drag-handle"
              aria-label={`Drag ${exerciseName} to reorder`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              type="button"
            >
              <span aria-hidden="true">⠿</span>
            </Button>
            <p className="font-semibold">
              <span className="mr-2 font-mono text-xs text-muted-steel">
                {String(entryIndex + 1).padStart(2, "0")}
              </span>
              {exerciseName}
            </p>
          </div>
          <p className="mt-0.5 pl-8 text-xs text-muted-steel">{equipment}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="icon"
            aria-label={`Move ${exerciseName} up`}
            disabled={entryIndex === 0}
            onClick={() => onMove(-1)}
            type="button"
          >
            ↑
          </Button>
          <Button
            variant="icon"
            aria-label={`Move ${exerciseName} down`}
            disabled={entryIndex === totalEntries - 1}
            onClick={() => onMove(1)}
            type="button"
          >
            ↓
          </Button>
          <Button
            variant="icon-danger"
            aria-label={`Remove ${exerciseName}`}
            onClick={onRemove}
            type="button"
          >
            ×
          </Button>
        </div>
      </div>

      <SetRepEditor
        entryKey={entry.key}
        exerciseName={exerciseName}
        onAddSet={onAddSet}
        onChange={onChangeSet}
        onRemoveSet={onRemoveSet}
        targetSets={entry.targetSets}
      />
    </li>
  );
}
