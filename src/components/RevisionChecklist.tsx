import { useEffect, useId, useRef, useState } from "react";
import { criterionLabels } from "../../shared/schemas";
import type { EvaluationResult } from "../../shared/types";
import { getRevisionReminders } from "../features/attempts/revisionChecklist";

interface RevisionChecklistProps {
  evaluation: EvaluationResult;
  focusHeading: boolean;
}

export function RevisionChecklist({ evaluation, focusHeading }: RevisionChecklistProps) {
  const titleId = useId();
  const noteId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const { criterion, suggestions } = getRevisionReminders(evaluation);
  const [reviewed, setReviewed] = useState<readonly boolean[]>(() => suggestions.map(() => false));
  const reviewedCount = reviewed.filter(Boolean).length;

  useEffect(() => {
    if (focusHeading) heading.current?.focus();
  }, [focusHeading]);

  function toggleReminder(index: number) {
    setReviewed((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value));
  }

  if (suggestions.length === 0) return null;

  return (
    <section className="revision-checklist" aria-labelledby={titleId} aria-describedby={noteId}>
      <div className="revision-checklist__header">
        <div>
          <p className="revision-checklist__eyebrow">Focus from your latest feedback</p>
          <h3 id={titleId} tabIndex={-1} ref={heading}>Revision reminders</h3>
        </div>
        <p className="revision-checklist__count" role="status" aria-live="polite">
          {reviewedCount} of {suggestions.length} reviewed
        </p>
      </div>
      <p className="revision-checklist__focus">
        Lowest-scoring criterion: <strong>{criterionLabels[criterion]}</strong>
      </p>
      <progress
        value={reviewedCount}
        max={suggestions.length}
        aria-label={`Revision reminders reviewed: ${reviewedCount} of ${suggestions.length}`}
      />
      <p className="revision-checklist__note" id={noteId}>
        Use these suggestions while editing. Checking a reminder only marks it as reviewed; it does not prove your solution has improved.
      </p>
      <ul className="revision-checklist__items">
        {suggestions.map((suggestion, index) => (
          <li
            className={`revision-checklist__item${reviewed[index] ? " revision-checklist__item--reviewed" : ""}`}
            key={index}
          >
            <label>
              <input
                type="checkbox"
                checked={reviewed[index] ?? false}
                onChange={() => toggleReminder(index)}
              />
              <span>{suggestion}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
