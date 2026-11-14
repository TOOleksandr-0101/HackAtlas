import { useRef, useState, type FormEvent } from "react";
import { MAX_ANSWER_LENGTH, answerKeys, answerLabels, solutionAnswersSchema } from "../../shared/schemas";
import type { AnswerKey, Attempt, Challenge, SolutionAnswers } from "../../shared/types";
import { useEvaluation } from "../hooks/useApi";
import { useAttempts, useDraft } from "../hooks/useLearning";
import { RevisionChecklist } from "./RevisionChecklist";
import { ErrorNotice } from "./Status";

const fieldHints: Record<AnswerKey, string> = {
  problem: "Describe a specific problem and its effect on the people who experience it.",
  targetUser: "Identify the group you would serve first and explain why.",
  proposedSolution: "Describe how the product would work and how it addresses the problem.",
  mvpFeatures: "List three essential features and explain what each helps the user do.",
  validationStrategy: "Describe a test, the people you would involve, and what result would guide your next decision.",
};

interface SolutionFormProps {
  challenge: Challenge;
  initialAnswers: SolutionAnswers;
  isRevision: boolean;
  revisionAttempt?: Attempt | null;
  focusRevisionChecklist?: boolean;
  onSaved: () => void;
  onCancel?: () => void;
}

export function SolutionForm({
  challenge,
  initialAnswers,
  isRevision,
  revisionAttempt,
  focusRevisionChecklist = false,
  onSaved,
  onCancel,
}: SolutionFormProps) {
  const { evaluate, error, resetError } = useEvaluation();
  const { saveAttempt } = useAttempts(challenge.id);
  const { updateDraft } = useDraft(challenge.id);
  const [answers, setAnswers] = useState(initialAnswers);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AnswerKey, string>>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pending = useRef(false);
  const filledCount = answerKeys.filter((key) => answers[key].trim()).length;

  function changeAnswer(key: AnswerKey, value: string) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setSaveError(null);
    resetError();
    updateDraft(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;

    setFieldErrors({});
    setSaveError(null);
    resetError();
    const result = solutionAnswersSchema.safeParse(answers);
    if (!result.success) {
      const errors: Partial<Record<AnswerKey, string>> = {};
      for (const key of answerKeys) {
        const issue = result.error.issues.find((item) => item.path[0] === key);
        if (issue) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      const firstInvalid = answerKeys.find((key) => errors[key]);
      if (firstInvalid) document.getElementById(`answer-${firstInvalid}`)?.focus();
      return;
    }

    pending.current = true;
    setIsSubmitting(true);
    try {
      const evaluation = await evaluate(challenge.id, result.data);
      try {
        await saveAttempt(challenge.id, result.data, evaluation);
      } catch {
        setSaveError("Your attempt could not be saved. Your answers are still in the form.");
        return;
      }
      onSaved();
    } catch {
      // useEvaluation provides the user-facing API error.
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <section className="card workspace-panel form-panel" aria-labelledby="solution-heading">
      <div className="form-panel__header">
        <h2 id="solution-heading">{isRevision ? "Revise your solution" : "Your solution"}</h2>
        <p>{filledCount} of {answerKeys.length} answered</p>
      </div>
      <progress value={filledCount} max={answerKeys.length} aria-label="Answered questions" />
      {revisionAttempt ? (
        <RevisionChecklist
          key={revisionAttempt.id}
          evaluation={revisionAttempt.evaluation}
          focusHeading={focusRevisionChecklist}
        />
      ) : null}
      <form onSubmit={submit} noValidate aria-busy={isSubmitting}>
        <fieldset disabled={isSubmitting}>
          {answerKeys.map((key) => {
            const fieldError = fieldErrors[key] ?? error?.fieldErrors?.[`answers.${key}`];
            return (
              <div className="form-field" key={key}>
                <label htmlFor={`answer-${key}`}>{answerLabels[key]}</label>
                <div className="field-guidance">
                  <p className="field-hint" id={`hint-${key}`}>{fieldHints[key]}</p>
                  <p className="character-count" id={`count-${key}`}>{answers[key].length}/{MAX_ANSWER_LENGTH}</p>
                </div>
                <textarea
                  id={`answer-${key}`}
                  name={key}
                  rows={3}
                  required
                  maxLength={MAX_ANSWER_LENGTH}
                  value={answers[key]}
                  aria-invalid={Boolean(fieldError)}
                  aria-describedby={`hint-${key} count-${key}${fieldError ? ` error-${key}` : ""}`}
                  onChange={(event) => changeAnswer(key, event.target.value)}
                />
                {fieldError && <p className="field-error" id={`error-${key}`}>{fieldError}</p>}
              </div>
            );
          })}
        </fieldset>
        {error && <ErrorNotice message={error.message} />}
        {saveError && <ErrorNotice message={saveError} />}
        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={isSubmitting}>
            {isSubmitting ? "Evaluating solution…" : "Submit Solution"}
          </button>
          {onCancel && (
            <button type="button" className="button button--secondary" disabled={isSubmitting} onClick={onCancel}>
              View last feedback
            </button>
          )}
        </div>
        <p className="field-hint" role="status">
          {isSubmitting ? "Reviewing your answers against the challenge rubric." : "Draft changes are saved automatically in this browser. Submitted answers are sent to OpenRouter for evaluation."}
        </p>
      </form>
    </section>
  );
}
