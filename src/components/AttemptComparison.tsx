import { criterionKeys, criterionLabels } from "../../shared/schemas";
import type { AttemptComparison as Comparison } from "../features/progress/learningProgress";

export function ScoreChange({ value }: { value: number }) {
  const direction = value > 0 ? "up" : value < 0 ? "down" : "same";
  return (
    <span className={`score-change score-change--${direction}`}>
      {value > 0 ? "+" : ""}{value}
    </span>
  );
}

export function AttemptComparison({ comparison }: { comparison: Comparison }) {
  const { fromAttempt: from, toAttempt: to, criterionDeltas, totalDelta } = comparison;
  return (
    <div className="table-scroll">
      <table className="score-table">
        <thead>
          <tr>
            <th scope="col">Criterion</th>
            <th scope="col">Attempt {from.attemptNumber}</th>
            <th scope="col">Attempt {to.attemptNumber}</th>
            <th scope="col">Change</th>
          </tr>
        </thead>
        <tbody>
          {criterionKeys.map((key) => {
            const before = from.evaluation.criteria[key].score;
            const after = to.evaluation.criteria[key].score;
            return (
              <tr key={key}>
                <th scope="row">{criterionLabels[key]}</th>
                <td>{before}/20</td>
                <td>{after}/20</td>
                <td><ScoreChange value={criterionDeltas[key]} /></td>
              </tr>
            );
          })}
          <tr className="score-table__total">
            <th scope="row">Total</th>
            <td>{from.evaluation.totalScore}/100</td>
            <td>{to.evaluation.totalScore}/100</td>
            <td><ScoreChange value={totalDelta} /></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
