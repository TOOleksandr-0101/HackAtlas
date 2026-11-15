import { criterionKeys } from '../../../shared/schemas.js'
import type { Attempt, CriterionKey } from '../../../shared/types.js'
import { calculateSkillProgress } from './learningProgress.js'

export type LearningPath = Readonly<{
  skill: CriterionKey
  score: number
  practiceTitle: string
  description: string
  challengeId: string
}>

type PracticeRecommendation = Pick<LearningPath, 'practiceTitle' | 'description'>

const practiceRecommendations: Record<CriterionKey, PracticeRecommendation> = {
  problemUnderstanding: {
    practiceTitle: 'Map the problem moment',
    description: 'Return to this challenge and define one recurring problem moment: who experiences it, when it happens, how often, and what consequence follows. Keep the solution out until the problem is precise.',
  },
  targetAudience: {
    practiceTitle: 'Narrow the first customer segment',
    description: 'Choose one reachable group with a shared behavior, name its most urgent need, and explain why this segment should be served before broader audiences.',
  },
  solutionQuality: {
    practiceTitle: 'Trace pain to product action',
    description: 'Connect each core feature to a stated user pain, the action a user takes, and the behavior that should change. Remove features that do not support that chain.',
  },
  mvpFeasibility: {
    practiceTitle: 'Cut the MVP to three essentials',
    description: 'Keep exactly three features needed to test the central idea, state what you would exclude, and explain how the smaller scope fits the challenge constraints.',
  },
  validationStrategy: {
    practiceTitle: 'Design a measurable experiment',
    description: 'Write a falsifiable hypothesis, outcome metric, success threshold, participant group, comparison, duration, and realistic method for collecting the result.',
  },
}

export function calculateLearningPath(attempts: readonly Attempt[]): LearningPath | null {
  const skillProgress = calculateSkillProgress(attempts)
  if (!skillProgress) return null
  const { latestAttempts, averages } = skillProgress

  let weakestSkill: CriterionKey = criterionKeys[0]
  for (const key of criterionKeys.slice(1)) {
    if (averages[key] < averages[weakestSkill]) weakestSkill = key
  }

  let recommendedAttempt = latestAttempts[0]!
  for (const attempt of latestAttempts.slice(1)) {
    const score = attempt.evaluation.criteria[weakestSkill].score
    const recommendedScore = recommendedAttempt.evaluation.criteria[weakestSkill].score
    if (score < recommendedScore || (score === recommendedScore && attempt.challengeId < recommendedAttempt.challengeId)) {
      recommendedAttempt = attempt
    }
  }

  return {
    skill: weakestSkill,
    score: averages[weakestSkill],
    ...practiceRecommendations[weakestSkill],
    challengeId: recommendedAttempt.challengeId,
  }
}
