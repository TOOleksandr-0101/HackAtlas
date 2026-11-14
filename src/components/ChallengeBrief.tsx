import { criterionKeys, criterionLabels } from "../../shared/schemas";
import type { Challenge } from "../../shared/types";

function BriefList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="brief-section">
      <h3>{title}</h3>
      <ul className="content-list">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

export function ChallengeBrief({ challenge }: { challenge: Challenge }) {
  return (
    <aside className="card workspace-panel" aria-labelledby="brief-heading">
      <h2 id="brief-heading">Challenge brief</h2>
      <p>{challenge.scenario}</p>
      <section className="brief-section">
        <h3>Business context</h3>
        <p>{challenge.businessContext}</p>
      </section>
      <section className="brief-section">
        <h3>Target user</h3>
        <p>{challenge.targetUser}</p>
      </section>
      <BriefList title="Constraints" items={challenge.constraints} />
      <BriefList title="Expected deliverables" items={challenge.expectedDeliverables} />
      <BriefList title="Learning objectives" items={challenge.learningObjectives} />
      <details className="disclosure">
        <summary>Evaluation criteria</summary>
        <p>Each criterion is scored out of 20.</p>
        <dl className="rubric">
          {criterionKeys.map((key) => {
            const criterion = challenge.rubric[key];
            return (
              <div key={key}>
                <dt>{criterionLabels[key]}</dt>
                <dd>{criterion.description}</dd>
              </div>
            );
          })}
        </dl>
      </details>
      {challenge.hints && challenge.hints.length > 0 && (
        <details className="disclosure">
          <summary>Hints</summary>
          <ul className="content-list">
            {challenge.hints.map((hint) => <li key={hint}>{hint}</li>)}
          </ul>
        </details>
      )}
    </aside>
  );
}
