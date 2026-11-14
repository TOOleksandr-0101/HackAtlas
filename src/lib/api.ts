import { z } from 'zod'
import {
  apiErrorSchema, challengeListSchema, challengeSchema, evaluateRequestSchema, evaluationResultSchema,
} from '../../shared/schemas.js'
import type { ApiErrorCode, SolutionAnswers } from '../../shared/types.js'

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: ApiErrorCode,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

export function toApiRequestError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) return error
  return new ApiRequestError('HackAtlas could not be reached. Check your connection and try again.', 0, 'INTERNAL_ERROR')
}

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  let body: unknown
  try {
    body = await response.json()
  } catch (error) {
    if (init?.signal?.aborted) throw error
  }

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body)
    if (parsed.success) {
      const { message, code, fieldErrors } = parsed.data.error
      throw new ApiRequestError(message, response.status, code, fieldErrors)
    }
    if (response.status === 429) {
      throw new ApiRequestError('Too many requests. Wait a moment and try again.', response.status, 'RATE_LIMITED')
    }
    throw new ApiRequestError('HackAtlas could not complete the request. Try again shortly.', response.status, 'INTERNAL_ERROR')
  }

  const parsed = schema.safeParse(body)
  if (parsed.success) return parsed.data
  throw new ApiRequestError('HackAtlas returned an unreadable response. Try again shortly.', response.status, 'INTERNAL_ERROR')
}

const healthSchema = z.strictObject({ status: z.literal('ok') })

export const api = {
  getHealth: (signal?: AbortSignal) => request('/api/health', healthSchema, { signal }),
  getChallenges: (signal?: AbortSignal) => request('/api/challenges', challengeListSchema, { signal }),
  getChallenge: (id: string, signal?: AbortSignal) =>
    request(`/api/challenges/${encodeURIComponent(id)}`, challengeSchema, { signal }),
  async evaluate(challengeId: string, answers: SolutionAnswers, signal?: AbortSignal) {
    const submission = evaluateRequestSchema.safeParse({ challengeId, answers })
    if (!submission.success) {
      const fieldErrors = Object.fromEntries(submission.error.issues.map((issue) => [
        issue.path.join('.'), issue.message,
      ]))
      throw new ApiRequestError('Check the highlighted fields and try again.', 400, 'INVALID_INPUT', fieldErrors)
    }

    return request('/api/evaluate', evaluationResultSchema, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission.data),
      signal,
    })
  },
}
