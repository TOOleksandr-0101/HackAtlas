import { Link } from "react-router-dom";
import { criterionLabels } from "../../shared/schemas";
import type { LearningPath } from "../features/progress/learningPath";

const scoreFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

interface LearningPathCardProps {
  learningPath: LearningPath;
  challengeTitle: string;
}

export function LearningPathCard({ learningPath, challengeTitle }: LearningPathCardProps) {
  const skillLabel = criterionLabels[learningPath.skill];
  const score = scoreFormat.format(learningPath.score);

  return (
    <section className="card learning-path-card" aria-labelledby="learning-path-title">
      <header className="learning-path-card__header">
        <div>
          <p className="learning-path-card__eyebrow">Personalized next step</p>
          <h2 id="learning-path-title">Your learning path</h2>
        </div>
        <p>Focus your next revision where it can build the most skill.</p>
      </header>

      <div className="learning-path-card__body">
        <div className="learning-path-card__focus">
          <p className="learning-path-card__label">Weakest skill</p>
          <div className="learning-path-card__skill">
            <h3>{skillLabel}</h3>
            <p className="learning-path-card__score"><strong>{score}</strong><span>/20 average</span></p>
          </div>
          <progress
            value={learningPath.score}
            max={20}
            aria-label={`${skillLabel}: ${score} out of 20 average`}
          />
          <p className="learning-path-card__context">Based on your latest evaluated attempt for each challenge.</p>
        </div>

        <div className="learning-path-card__practice">
          <p className="learning-path-card__label">Recommended practice</p>
          <h3>{learningPath.practiceTitle}</h3>
          <p>{learningPath.description}</p>
          <p className="learning-path-card__challenge">Practice case: <strong>{challengeTitle}</strong></p>
          <Link className="button button--primary" to={`/challenges/${learningPath.challengeId}`}>
            Practice this skill <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
