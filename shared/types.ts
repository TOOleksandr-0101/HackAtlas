import type { z } from 'zod'
import type {
  answerKeys, apiErrorCodeSchema, apiErrorSchema, attemptSchema, challengeDifficultySchema,
  challengeSchema, criterionEvaluationSchema, criterionKeys, evaluateRequestSchema,
  evaluationResultSchema, modelEvaluationSchema, solutionAnswersSchema,
} from './schemas.js'

export type AnswerKey = (typeof answerKeys)[number]
export type CriterionKey = (typeof criterionKeys)[number]
export type ChallengeDifficulty = z.infer<typeof challengeDifficultySchema>
export type Challenge = z.infer<typeof challengeSchema>
export type SolutionAnswers = z.infer<typeof solutionAnswersSchema>
export type CriterionEvaluation = z.infer<typeof criterionEvaluationSchema>
export type EvaluationResult = z.infer<typeof evaluationResultSchema>
export type ModelEvaluation = z.infer<typeof modelEvaluationSchema>
export type EvaluateRequest = z.infer<typeof evaluateRequestSchema>
export type Attempt = z.infer<typeof attemptSchema>
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>
export type ApiError = z.infer<typeof apiErrorSchema>
