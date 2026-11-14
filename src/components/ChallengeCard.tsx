import { Link } from "react-router-dom";
import type { Challenge, ChallengeDifficulty } from "../../shared/types";

export const difficultyLabels: Record<ChallengeDifficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function ChallengeCard({ challenge, recommended = false }: { challenge: Challenge; recommended?: boolean }) {
  return (
    <article className={`card challenge-card${recommended ? " challenge-card--recommended" : ""}`}>
      <div className="challenge-card__meta">
        <span className={`difficulty difficulty--${challenge.difficulty}`}>
          {difficultyLabels[challenge.difficulty]}
        </span>
        <span>{challenge.estimatedMinutes} min</span>
        {recommended && <span className="challenge-card__recommendation">Recommended practice</span>}
      </div>
      <div>
        <p className="challenge-card__category">{challenge.category}</p>
        <h2>{challenge.title}</h2>
        <p>{challenge.scenario}</p>
      </div>
      <Link
        className="button button--secondary"
        to={`/challenges/${challenge.id}`}
        aria-label={`Open challenge: ${challenge.title}`}
      >
        Open challenge <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
