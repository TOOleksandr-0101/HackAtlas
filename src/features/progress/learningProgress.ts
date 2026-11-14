import { criterionKeys } from '../../../shared/schemas.js'
import type { Attempt, CriterionKey } from '../../../shared/types.js'

export type AttemptComparison = {
  fromAttempt: Attempt
  toAttempt: Attempt
  totalDelta: number
  criterionDeltas: Record<CriterionKey, number>
}

export function compareAttempts(fromAttempt: Attempt, toAttempt: Attempt): AttemptComparison {
  const criterionDeltas = Object.fromEntries(criterionKeys.map((key) => [
    key, toAttempt.evaluation.criteria[key].score - fromAttempt.evaluation.criteria[key].score,
  ])) as Record<CriterionKey, number>

  return {
    fromAttempt,
    toAttempt,
    totalDelta: toAttempt.evaluation.totalScore - fromAttempt.evaluation.totalScore,
    criterionDeltas,
  }
}

export type LearningProgress = {
  challengesAttempted: number
  challengesCompleted: number
  totalAttempts: number
  latestScore: number | null
  bestScore: number | null
  averageScore: number | null
  criterionAverages: Record<CriterionKey, number> | null
  recentAttempts: Attempt[]
  history: AttemptComparison[]
}

// Attempts are stored in newest-first submission order.
export function calculateProgress(attempts: readonly Attempt[]): LearningProgress {
  const latestByChallenge = new Map<string, Attempt>()
  const history: AttemptComparison[] = []
  const criterionTotals: Record<CriterionKey, number> = {
    problemUnderstanding: 0,
    targetAudience: 0,
    solutionQuality: 0,
    mvpFeasibility: 0,
    validationStrategy: 0,
  }
  let total = 0
  let bestScore: number | null = null

  for (const attempt of [...attempts].reverse()) {
    const previous = latestByChallenge.get(attempt.challengeId)
    if (previous) history.push(compareAttempts(previous, attempt))
    latestByChallenge.set(attempt.challengeId, attempt)
    const score = attempt.evaluation.totalScore
    total += score
    bestScore = Math.max(bestScore ?? score, score)
    for (const key of criterionKeys) criterionTotals[key] += attempt.evaluation.criteria[key].score
  }

  const count = attempts.length
  const criterionAverages = count === 0 ? null : Object.fromEntries(
    criterionKeys.map((key) => [key, criterionTotals[key] / count]),
  ) as Record<CriterionKey, number>

  return {
    challengesAttempted: latestByChallenge.size,
    challengesCompleted: latestByChallenge.size,
    totalAttempts: count,
    latestScore: attempts[0]?.evaluation.totalScore ?? null,
    bestScore,
    averageScore: count === 0 ? null : total / count,
    criterionAverages,
    recentAttempts: attempts.slice(0, 10),
    history: history.reverse(),
  }
}
