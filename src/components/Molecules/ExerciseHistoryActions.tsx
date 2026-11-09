import { useState } from "react";
import {
  getCoachSuggestions,
  getRandomCoachOpening,
} from "../../constants/profile-copy/coach-suggestions";
import type { ExerciseHistorySet } from "../../lib/workouts";
import { CharacterChat } from "./CharacterChat";
import { DisclosureDrawer } from "./DisclosureDrawer";
import { RecentExerciseTrends } from "./RecentExerciseTrends";
import type { ProfileCharacter } from "../../lib/database.types";

type ExerciseHistoryActionsProps = {
  exerciseId: string;
  muscleGroups: readonly string[];
  previousSets: ExerciseHistorySet[];
  profileCharacter: ProfileCharacter | null;
  targetReps: (string | null)[];
};

export function ExerciseHistoryActions({
  exerciseId,
  muscleGroups,
  previousSets,
  profileCharacter,
  targetReps,
}: ExerciseHistoryActionsProps) {
  const [openPanel, setOpenPanel] = useState<"trends" | "coach" | null>(null);
  const [coachOpening] = useState(() =>
    getRandomCoachOpening(profileCharacter),
  );
  const coachSuggestions = getCoachSuggestions(
    profileCharacter,
    previousSets,
    targetReps,
    coachOpening,
    muscleGroups,
  );
  const isTrendsOpen = openPanel === "trends";
  const isCoachOpen = openPanel === "coach";

  return (
    <div className="mt-2 space-y-3">
      <DisclosureDrawer
        contentClassName="mt-2 rounded-md border border-secondary/40 bg-surface/40 p-3"
        contentId="exercise-trends-panel"
        isOpen={isTrendsOpen}
        onToggle={() =>
          setOpenPanel((open) => (open === "trends" ? null : "trends"))
        }
        trigger={(isOpen) => (isOpen ? "Hide Recent Trends" : "Recent Trends")}
        variant="outline-secondary-small"
      >
        <RecentExerciseTrends
          exerciseId={exerciseId}
          profileCharacter={profileCharacter}
        />
      </DisclosureDrawer>
      <DisclosureDrawer
        contentClassName="mt-4 space-y-3 rounded-md border border-accent/40 bg-surface/40 p-4"
        contentId="exercise-coach-panel"
        isOpen={isCoachOpen}
        onToggle={() =>
          setOpenPanel((open) => (open === "coach" ? null : "coach"))
        }
        trigger={(isOpen) =>
          isOpen ? "Hide Coach Suggestions" : "Coach Suggestions"
        }
        variant="outline-accent-small"
      >
        <CharacterChat
          ariaLabel="Coach suggestions"
          profileCharacter={profileCharacter}
          message={coachSuggestions.opening}
        />
        <ul className="w-full list-disc space-y-2 py-1 pr-3 pl-8 text-xs leading-relaxed text-starlight">
          {coachSuggestions.suggestions.map((suggestion) => (
            <li key={suggestion.label}>
              <span className="font-semibold text-secondary">
                {suggestion.label}:
              </span>{" "}
              {suggestion.description}
            </li>
          ))}
        </ul>
      </DisclosureDrawer>
    </div>
  );
}
