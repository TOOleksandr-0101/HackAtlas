import { criterionKeys } from '../../../shared/schemas.js'
import type { CriterionKey, EvaluationResult } from '../../../shared/types.js'

export type RevisionReminders = Readonly<{
  criterion: CriterionKey
  suggestions: readonly string[]
}>

export function getRevisionReminders(evaluation: EvaluationResult): RevisionReminders {
  let weakestCriterion: CriterionKey = criterionKeys[0]
  for (const key of criterionKeys.slice(1)) {
    if (evaluation.criteria[key].score < evaluation.criteria[weakestCriterion].score) {
      weakestCriterion = key
    }
  }

  return {
    criterion: weakestCriterion,
    suggestions: evaluation.criteria[weakestCriterion].suggestions.slice(0, 3),
  }
}
