import { Link } from "react-router-dom";
import { criterionKeys, criterionLabels } from "../../shared/schemas";
import { AttemptComparison, ScoreChange } from "../components/AttemptComparison";
import { LearningPathCard } from "../components/LearningPathCard";
import { ErrorNotice } from "../components/Status";
import { useChallenges } from "../hooks/useApi";
import { useProgress } from "../hooks/useLearning";

const scoreFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card metric">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function scoreLabel(value: number | null) {
  return value === null ? "—" : `${scoreFormat.format(value)}/100`;
}

export function ProgressPage() {
  const { progress, learningPath, storageError } = useProgress();
  const { data: challenges, error: challengeError, retry: retryChallenges } = useChallenges();
  const titles = new Map(challenges?.map((challenge) => [challenge.id, challenge.title]));
  const { criterionAverages } = progress;
  function challengeTitle(id: string) {
    return titles.get(id) ?? id.replaceAll("-", " ");
  }

  return (
    <div className="page wrap">
      <header className="page-heading">
        <h1>My progress</h1>
        <p>Your evaluated attempts and scores saved in this browser.</p>
      </header>
      {storageError && <ErrorNotice message={storageError} />}
      {challengeError && (
        <ErrorNotice
          message={progress.totalAttempts === 0
            ? "Challenge titles could not be refreshed. Try again to load the current library."
            : "Challenge titles could not be refreshed. Your saved progress is still available below."}
          retry={retryChallenges}
        />
      )}
      {progress.totalAttempts === 0 ? (
        <section className="card empty-state">
          <h2>Complete your first challenge</h2>
          <p>Your scores will appear here after you submit a solution and receive feedback.</p>
          <Link to="/challenges" className="button button--primary">Browse challenges</Link>
        </section>
      ) : (
        <>
          <dl className="metrics-grid">
            <Metric label="Challenges attempted" value={progress.challengesAttempted} />
            <Metric label="Challenges completed" value={progress.challengesCompleted} />
            <Metric label="Total attempts" value={progress.totalAttempts} />
            <Metric label="Latest score" value={scoreLabel(progress.latestScore)} />
            <Metric label="Best score" value={scoreLabel(progress.bestScore)} />
            <Metric label="Average score" value={scoreLabel(progress.averageScore)} />
          </dl>
          {learningPath && (
            <LearningPathCard
              learningPath={learningPath}
              challengeTitle={challengeTitle(learningPath.challengeId)}
            />
          )}
          <div className="progress-grid">
            {criterionAverages && (
              <section className="card workspace-panel" aria-labelledby="skills-title">
                <h2 id="skills-title">Skill scores</h2>
                <p>Average scores by criterion, using your latest evaluated attempt for each challenge.</p>
                <ul className="skills-list">
                  {criterionKeys.map((key) => {
                    const score = criterionAverages[key];
                    return (
                      <li key={key}>
                        <div>
                          <span>{criterionLabels[key]}</span>
                          <strong>{scoreFormat.format(score)}/20</strong>
                        </div>
                        <progress value={score} max={20} aria-label={criterionLabels[key]} />
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            <section className="card workspace-panel" aria-labelledby="recent-title">
              <h2 id="recent-title">Recent attempts</h2>
              <ul className="recent-list">
                {progress.recentAttempts.map((attempt) => (
                  <li key={attempt.id}>
                    <div>
                      <Link to={`/challenges/${attempt.challengeId}`}>{challengeTitle(attempt.challengeId)}</Link>
                      <p>Attempt {attempt.attemptNumber} · {dateFormat.format(new Date(attempt.createdAt))}</p>
                    </div>
                    <strong>{attempt.evaluation.totalScore}/100</strong>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <section className="card workspace-panel progress-history" aria-labelledby="history-title">
            <h2 id="history-title">Revision history</h2>
            {progress.history.length === 0 && <p>Submit a second attempt to compare your scores.</p>}
            {progress.history.map((change) => (
              <details className="disclosure" key={change.toAttempt.id}>
                <summary>
                  <span>
                    {challengeTitle(change.toAttempt.challengeId)} · Attempt {change.fromAttempt.attemptNumber}
                    {" → "}{change.toAttempt.attemptNumber}
                  </span>
                  <ScoreChange value={change.totalDelta} />
                </summary>
                <AttemptComparison comparison={change} />
              </details>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
