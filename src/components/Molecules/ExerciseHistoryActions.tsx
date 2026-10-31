import { useState } from "react";
import {
  getCoachSuggestions,
  getRandomCoachOpening,
} from "../../constants/profile-copy/coach-suggestions";
import type { ExerciseHistorySet } from "../../lib/workouts";
import { CharacterChat } from "./CharacterChat";
import { DisclosureDrawer } from "./DisclosureDrawer";
import { RecentExerciseTrends } from "./RecentExerciseTrends";

type ExerciseHistoryActionsProps = {
  contextMessage: string | null;
  exerciseId: string;
  previousSets: ExerciseHistorySet[];
  profileName: string;
  targetReps: (string | null)[];
};

export function ExerciseHistoryActions({
  contextMessage,
  exerciseId,
  previousSets,
  profileName,
  targetReps,
}: ExerciseHistoryActionsProps) {
  const [openPanel, setOpenPanel] = useState<
    "context" | "trends" | "coach" | null
  >(null);
  const [coachOpening] = useState(() => getRandomCoachOpening(profileName));
  const coachSuggestions = getCoachSuggestions(
    profileName,
    previousSets,
    targetReps,
    coachOpening,
  );
  const isContextOpen = openPanel === "context";
  const isTrendsOpen = openPanel === "trends";
  const isCoachOpen = openPanel === "coach";

  return (
    <div className="mt-2 space-y-3">
      {contextMessage && (
        <DisclosureDrawer
          contentClassName="mt-2 rounded-md border border-primary/40 bg-surface/40 p-3"
          contentId="exercise-context-panel"
          isOpen={isContextOpen}
          onToggle={() =>
            setOpenPanel((open) => (open === "context" ? null : "context"))
          }
          trigger={(isOpen) =>
            isOpen ? "Hide More Context" : "Show More Context"
          }
          variant="outline-primary-small"
        >
          <CharacterChat
            profileName={profileName}
            message={contextMessage}
          />
        </DisclosureDrawer>
      )}
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
          profileName={profileName}
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
          profileName={profileName}
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
