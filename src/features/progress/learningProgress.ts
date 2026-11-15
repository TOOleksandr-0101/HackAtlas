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

function isLaterAttempt(candidate: Attempt, current: Attempt): boolean {
  if (candidate.attemptNumber !== current.attemptNumber) {
    return candidate.attemptNumber > current.attemptNumber
  }

  const candidateTime = Date.parse(candidate.createdAt)
  const currentTime = Date.parse(current.createdAt)
  if (candidateTime !== currentTime) return candidateTime > currentTime
  return candidate.id < current.id
}

export function calculateSkillProgress(attempts: readonly Attempt[]) {
  if (attempts.length === 0) return null

  const latestByChallenge = new Map<string, Attempt>()
  for (const attempt of attempts) {
    const current = latestByChallenge.get(attempt.challengeId)
    if (!current || isLaterAttempt(attempt, current)) latestByChallenge.set(attempt.challengeId, attempt)
  }
  const latestAttempts = [...latestByChallenge.values()]
  const averages = Object.fromEntries(criterionKeys.map((key) => [
    key,
    latestAttempts.reduce((total, attempt) => total + attempt.evaluation.criteria[key].score, 0)
      / latestAttempts.length,
  ])) as Record<CriterionKey, number>

  return { latestAttempts, averages }
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
  let total = 0
  let bestScore: number | null = null

  for (const attempt of [...attempts].reverse()) {
    const previous = latestByChallenge.get(attempt.challengeId)
    if (previous) history.push(compareAttempts(previous, attempt))
    latestByChallenge.set(attempt.challengeId, attempt)
    const score = attempt.evaluation.totalScore
    total += score
    bestScore = Math.max(bestScore ?? score, score)
  }

  const count = attempts.length

  return {
    challengesAttempted: latestByChallenge.size,
    challengesCompleted: latestByChallenge.size,
    totalAttempts: count,
    latestScore: attempts[0]?.evaluation.totalScore ?? null,
    bestScore,
    averageScore: count === 0 ? null : total / count,
    criterionAverages: calculateSkillProgress(attempts)?.averages ?? null,
    recentAttempts: attempts.slice(0, 10),
    history: history.reverse(),
  }
}
