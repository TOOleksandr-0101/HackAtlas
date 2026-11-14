import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { answerKeys, emptyAnswers } from "../../shared/schemas";
import type { Challenge } from "../../shared/types";
import { ChallengeBrief } from "../components/ChallengeBrief";
import { EvaluationFeedback } from "../components/EvaluationFeedback";
import { SolutionForm } from "../components/SolutionForm";
import { difficultyLabels } from "../components/ChallengeCard";
import { ErrorNotice, LoadingNotice } from "../components/Status";
import { useChallenge } from "../hooks/useApi";
import { useAttempts, useDraft } from "../hooks/useLearning";

function ChallengeWorkspace({ challenge }: { challenge: Challenge }) {
  const { draft, storageError } = useDraft(challenge.id);
  const { attempts, latest, comparison } = useAttempts(challenge.id);
  const hasRevision = Boolean(draft && latest && answerKeys.some((key) => draft[key].trim() !== latest.answers[key]));
  const [mode, setMode] = useState<"edit" | "review">(() => hasRevision ? "edit" : "review");
  const [focusFeedback, setFocusFeedback] = useState(false);
  const [focusRevisionChecklist, setFocusRevisionChecklist] = useState(false);
  const isEditing = !latest || mode === "edit";

  return (
    <>
      <header className="page-heading">
        <p className="challenge-meta">
          <span className={`difficulty difficulty--${challenge.difficulty}`}>{difficultyLabels[challenge.difficulty]}</span>
          <span>{challenge.category}</span>
          <span>{challenge.estimatedMinutes} min</span>
        </p>
        <h1>{challenge.title}</h1>
      </header>
      {storageError && <ErrorNotice message={storageError} />}
      <div className="workspace-grid">
        <ChallengeBrief challenge={challenge} />
        {isEditing ? (
          <SolutionForm
            challenge={challenge}
            initialAnswers={draft ?? latest?.answers ?? emptyAnswers}
            isRevision={Boolean(latest)}
            revisionAttempt={latest}
            focusRevisionChecklist={focusRevisionChecklist}
            onSaved={() => {
              setFocusRevisionChecklist(false);
              setFocusFeedback(true);
              setMode("review");
            }}
            onCancel={latest ? () => {
              setFocusRevisionChecklist(false);
              setFocusFeedback(true);
              setMode("review");
            } : undefined}
          />
        ) : (
          <EvaluationFeedback
            challenge={challenge}
            attempt={latest}
            comparison={comparison}
            savedAttempts={attempts}
            focusHeading={focusFeedback}
            onImprove={() => {
              setFocusFeedback(false);
              setFocusRevisionChecklist(true);
              setMode("edit");
            }}
          />
        )}
      </div>
    </>
  );
}

export function ChallengeWorkspacePage() {
  const { id = "" } = useParams();
  const { data, error, isLoading, retry } = useChallenge(id);

  if (error?.code === "CHALLENGE_NOT_FOUND") {
    return (
      <div className="page wrap">
        <Link to="/challenges" className="back-link">← All challenges</Link>
        <section className="card empty-state" aria-labelledby="challenge-not-found-title">
          <h1 id="challenge-not-found-title">Challenge not found</h1>
          <p>This challenge does not exist or is no longer available.</p>
          <Link to="/challenges" className="button button--primary">Browse challenges</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="page wrap">
      <Link to="/challenges" className="back-link">← All challenges</Link>
      {isLoading && <LoadingNotice message="Loading challenge…" />}
      {error && <ErrorNotice message={error.message} retry={retry} />}
      {data && data.id === id && <ChallengeWorkspace key={id} challenge={data} />}
    </div>
  );
}
