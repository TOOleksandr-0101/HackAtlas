import { z } from 'zod'

export const MAX_ANSWER_LENGTH = 2_000
export const answerKeys = ['problem', 'targetUser', 'proposedSolution', 'mvpFeatures', 'validationStrategy'] as const
export const answerLabels = {
  problem: 'What problem are you solving?',
  targetUser: 'Who is your target user?',
  proposedSolution: 'What is your proposed solution?',
  mvpFeatures: 'What are the three essential MVP features?',
  validationStrategy: 'How would you validate your idea?',
} as const
export const emptyAnswers = { problem: '', targetUser: '', proposedSolution: '', mvpFeatures: '', validationStrategy: '' }

const answer = z.string().trim().min(1, 'Enter an answer.').max(MAX_ANSWER_LENGTH, `Use ${MAX_ANSWER_LENGTH.toLocaleString('en-US')} characters or fewer.`)
export const solutionAnswersSchema = z.strictObject({
  problem: answer,
  targetUser: answer,
  proposedSolution: answer,
  mvpFeatures: answer,
  validationStrategy: answer,
})

export const criterionKeys = ['problemUnderstanding', 'targetAudience', 'solutionQuality', 'mvpFeasibility', 'validationStrategy'] as const
export const criterionLabels = {
  problemUnderstanding: 'Problem Understanding',
  targetAudience: 'Target Audience Definition',
  solutionQuality: 'Solution Quality',
  mvpFeasibility: 'MVP Feasibility',
  validationStrategy: 'Validation Strategy',
} as const

const slug = z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a valid challenge ID.')
const namedText = z.string().trim().min(1)
const rubricCriterion = z.strictObject({
  description: namedText,
  anchors: z.strictObject({ weak: namedText, average: namedText, good: namedText, excellent: namedText }),
})
export const challengeDifficultySchema = z.enum(['beginner', 'intermediate', 'advanced'])
export const challengeSchema = z.strictObject({
  id: slug,
  title: namedText,
  category: namedText,
  difficulty: challengeDifficultySchema,
  estimatedMinutes: z.number().int().positive(),
  scenario: namedText,
  businessContext: namedText,
  targetUser: namedText,
  constraints: z.array(namedText).nonempty(),
  expectedDeliverables: z.array(namedText).nonempty(),
  learningObjectives: z.array(namedText).nonempty(),
  rubric: z.record(z.enum(criterionKeys), rubricCriterion),
  hints: z.array(namedText).optional(),
})
export const challengeListSchema = z.array(challengeSchema)

const feedbackText = z.string().trim().min(1).max(1_500)
export const criterionEvaluationSchema = z.strictObject({
  score: z.number().int().min(0).max(20),
  explanation: feedbackText,
  evidence: z.array(feedbackText).max(3),
  suggestions: z.array(feedbackText).min(1).max(3),
})
export const modelEvaluationSchema = z.strictObject({
  criteria: z.record(z.enum(criterionKeys), criterionEvaluationSchema),
  strengths: z.array(feedbackText).length(3),
  weaknesses: z.array(feedbackText).length(3),
  nextSteps: z.array(feedbackText).length(3),
  summary: feedbackText,
})
export const evaluationResultSchema = modelEvaluationSchema.extend({
  totalScore: z.number().int().min(0).max(100),
}).superRefine((result, context) => {
  const total = criterionKeys.reduce((sum, key) => sum + result.criteria[key].score, 0)
  if (result.totalScore !== total) {
    context.addIssue({ code: 'custom', path: ['totalScore'], message: 'Total must match the five criterion scores.' })
  }
})

export const evaluateRequestSchema = z.strictObject({ challengeId: slug, answers: solutionAnswersSchema })

export const attemptSchema = z.strictObject({
  id: z.string().min(1).max(100),
  challengeId: slug,
  createdAt: z.iso.datetime({ offset: true }),
  attemptNumber: z.number().int().positive(),
  answers: solutionAnswersSchema,
  evaluation: evaluationResultSchema,
})

export const apiErrorCodeSchema = z.enum([
  'INVALID_INPUT', 'CHALLENGE_NOT_FOUND', 'NOT_FOUND', 'METHOD_NOT_ALLOWED', 'EVALUATION_NOT_CONFIGURED',
  'PROVIDER_TIMEOUT', 'PROVIDER_FAILURE', 'INVALID_MODEL_OUTPUT', 'RATE_LIMITED', 'PAYLOAD_TOO_LARGE', 'INTERNAL_ERROR',
])
export const apiErrorSchema = z.strictObject({
  error: z.strictObject({
    code: apiErrorCodeSchema,
    message: namedText,
    fieldErrors: z.record(z.string(), namedText).optional(),
  }),
})
