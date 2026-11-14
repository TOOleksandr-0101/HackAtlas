import { useState } from "react";
import type { ChallengeDifficulty } from "../../shared/types";
import { ChallengeCard, difficultyLabels } from "../components/ChallengeCard";
import { ErrorNotice, LoadingNotice } from "../components/Status";
import { useChallenges } from "../hooks/useApi";
import { useProgress } from "../hooks/useLearning";

const filters = ["all", "beginner", "intermediate", "advanced"] as const;
type DifficultyFilter = ChallengeDifficulty | "all";

export function ChallengeLibraryPage() {
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const { data, isLoading, error, retry } = useChallenges();
  const { learningPath } = useProgress();
  const visible = data?.filter((challenge) => difficulty === "all" || challenge.difficulty === difficulty);

  return (
    <div className="page wrap">
      <header className="page-heading">
        <h1>Challenge library</h1>
        <p>Choose an original practice case to build your product skills.</p>
      </header>
      <div className="filter-bar" role="group" aria-label="Filter by difficulty">
        {filters.map((filter) => (
          <button
            className="filter-button"
            type="button"
            key={filter}
            aria-pressed={difficulty === filter}
            onClick={() => setDifficulty(filter)}
          >
            {filter === "all" ? "All levels" : difficultyLabels[filter]}
          </button>
        ))}
      </div>
      {isLoading && <LoadingNotice message="Loading challenges…" />}
      {error && <ErrorNotice message={error.message} retry={retry} />}
      {visible && (
        <>
          <p className="result-count" role="status">
            {visible.length === 1 ? "1 challenge" : `${visible.length} challenges`}
          </p>
          {visible.length > 0 && (
            <div className="challenge-grid">
              {visible.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  recommended={learningPath?.challengeId === challenge.id}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
