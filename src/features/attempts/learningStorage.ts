import { z } from 'zod'
import { attemptSchema, evaluateRequestSchema, MAX_ANSWER_LENGTH } from '../../../shared/schemas.js'
import type { Attempt, EvaluationResult, SolutionAnswers } from '../../../shared/types.js'

export const LEARNING_STORAGE_KEY = 'hackatlas.learning.v1'
export const challengeIdSchema = evaluateRequestSchema.shape.challengeId

const draftAnswer = z.string().max(MAX_ANSWER_LENGTH)
export const draftAnswersSchema = z.strictObject({
  problem: draftAnswer,
  targetUser: draftAnswer,
  proposedSolution: draftAnswer,
  mvpFeatures: draftAnswer,
  validationStrategy: draftAnswer,
})

const storageEnvelopeSchema = z.object({
  version: z.literal(1),
  drafts: z.unknown(),
  attempts: z.unknown(),
})

export type LearningState = {
  version: 1
  drafts: Record<string, SolutionAnswers>
  attempts: Attempt[]
}

export function emptyLearningState(): LearningState {
  return { version: 1, drafts: {}, attempts: [] }
}

export function parseLearningState(serialized: string | null): LearningState {
  const recovered = emptyLearningState()
  if (!serialized) return recovered

  let input: unknown
  try {
    input = JSON.parse(serialized)
  } catch {
    return recovered
  }

  const envelope = storageEnvelopeSchema.safeParse(input)
  if (!envelope.success) return recovered
  const drafts = z.record(z.string(), z.unknown()).safeParse(envelope.data.drafts)
  const attempts = z.array(z.unknown()).safeParse(envelope.data.attempts)
  return recoverEntries(drafts.data, attempts.data)
}

function recoverEntries(
  storedDrafts: Record<string, unknown> = {},
  storedAttempts: unknown[] = [],
): LearningState {
  const drafts: LearningState['drafts'] = {}
  for (const [id, value] of Object.entries(storedDrafts)) {
    const draft = draftAnswersSchema.safeParse(value)
    if (challengeIdSchema.safeParse(id).success && draft.success) drafts[id] = draft.data
  }

  const ids = new Set<string>()
  const attempts: Attempt[] = []
  for (const value of storedAttempts) {
    const attempt = attemptSchema.safeParse(value)
    if (!attempt.success || ids.has(attempt.data.id)) continue
    attempts.push(attempt.data)
    ids.add(attempt.data.id)
  }

  return { version: 1, drafts, attempts }
}

export function readDraft(state: LearningState, challengeId: string): SolutionAnswers | null {
  return Object.prototype.hasOwnProperty.call(state.drafts, challengeId) ? state.drafts[challengeId] : null
}

export function addAttempt(
  state: LearningState,
  input: {
    id: string
    challengeId: string
    createdAt: string
    answers: SolutionAnswers
    evaluation: EvaluationResult
  },
): Attempt {
  const lastNumber = state.attempts.reduce(
    (max, attempt) => attempt.challengeId === input.challengeId ? Math.max(max, attempt.attemptNumber) : max,
    0,
  )
  return attemptSchema.parse({ ...input, attemptNumber: lastNumber + 1 })
}
