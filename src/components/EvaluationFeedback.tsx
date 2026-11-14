import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { answerKeys, answerLabels, criterionKeys, criterionLabels } from "../../shared/schemas";
import type { Attempt, Challenge } from "../../shared/types";
import { AttemptComparison } from "./AttemptComparison";
import type { AttemptComparison as Comparison } from "../features/progress/learningProgress";
import { useChallenges } from "../hooks/useApi";

function FeedbackList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="feedback-list">
      <h3>{title}</h3>
      <ul className="content-list">
        {items.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
    </div>
  );
}

interface EvaluationFeedbackProps {
  challenge: Challenge;
  attempt: Attempt;
  comparison: Comparison | null;
  savedAttempts: Attempt[];
  focusHeading: boolean;
  onImprove: () => void;
}

export function EvaluationFeedback({
  challenge,
  attempt,
  comparison,
  savedAttempts,
  focusHeading,
  onImprove,
}: EvaluationFeedbackProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const { data: challenges } = useChallenges();
  const challengeIndex = challenges?.findIndex((item) => item.id === challenge.id) ?? -1;
  const nextChallenge = challengeIndex >= 0 ? challenges?.[challengeIndex + 1] : undefined;
  const result = attempt.evaluation;

  useEffect(() => {
    if (focusHeading) heading.current?.focus();
  }, [focusHeading, attempt.id]);

  return (
    <section className="card workspace-panel feedback-panel" aria-labelledby="feedback-heading">
      <div className="feedback-panel__heading">
        <div>
          <p className="feedback-panel__attempt">Attempt {attempt.attemptNumber}</p>
          <h2 id="feedback-heading" tabIndex={-1} ref={heading}>AI evaluation</h2>
        </div>
        <p className="total-score"><strong>{result.totalScore}</strong><span>/100</span></p>
      </div>
      <p>{result.summary}</p>
      <p className="field-hint">AI scores are educational estimates.</p>

      {comparison && (
        <section className="brief-section" aria-labelledby="comparison-title">
          <h3 id="comparison-title">Attempt comparison</h3>
          <AttemptComparison comparison={comparison} />
        </section>
      )}

      <section className="brief-section" aria-labelledby="criterion-title">
        <h3 id="criterion-title">Scores by criterion</h3>
        {criterionKeys.map((key) => {
          const criterion = result.criteria[key];
          return (
            <details className="disclosure criterion-details" key={key}>
              <summary>
                <span>{criterionLabels[key]}</span>
                <strong>{criterion.score}/20</strong>
              </summary>
              <p>{criterion.explanation}</p>
              {criterion.evidence.length > 0 && <FeedbackList title="Evidence in your answer" items={criterion.evidence} />}
              <FeedbackList title="Suggestions" items={criterion.suggestions} />
            </details>
          );
        })}
      </section>

      <FeedbackList title="What worked" items={result.strengths} />
      <FeedbackList title="What needs work" items={result.weaknesses} />
      <FeedbackList title="Next steps" items={result.nextSteps} />

      <div className="form-actions">
        <button type="button" className="button button--primary" onClick={onImprove}>Improve My Solution</button>
        <Link to="/progress" className="button button--secondary">View my progress</Link>
      </div>

      {nextChallenge && (
        <p className="next-challenge">
          Next challenge <Link to={`/challenges/${nextChallenge.id}`}>{nextChallenge.title}</Link>
        </p>
      )}

      <section className="brief-section" aria-labelledby="saved-title">
        <h3 id="saved-title">Saved answers</h3>
        {savedAttempts.map((saved) => (
          <details className="disclosure" key={saved.id}>
            <summary>Attempt {saved.attemptNumber} · {saved.evaluation.totalScore}/100</summary>
            <dl className="rubric saved-answers">
              {answerKeys.map((key) => (
                <div key={key}>
                  <dt>{answerLabels[key]}</dt>
                  <dd>{saved.answers[key]}</dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
      </section>
    </section>
  );
}
