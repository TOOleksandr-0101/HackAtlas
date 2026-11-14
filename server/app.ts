import { challenges, getChallenge } from '../data/challenges/index.js'
import { evaluateRequestSchema } from '../shared/schemas.js'
import type { ApiError } from '../shared/types.js'
import { createEvaluator, type EvaluatorOptions } from './services/openrouter.js'
import { ApiFailure } from './utils/errors.js'
import { createEvaluationRateLimit } from './utils/rate-limit.js'
import { readJson } from './utils/read-json.js'

type ApiOptions = EvaluatorOptions & { getClientId?: (request: Request) => string }

function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}

function requireMethod(request: Request, method: string) {
  if (request.method !== method) {
    throw new ApiFailure(405, 'METHOD_NOT_ALLOWED', `Use ${method} for this endpoint.`, {
      headers: { Allow: method },
    })
  }
}

function findChallenge(id: string) {
  const challenge = getChallenge(id)
  if (!challenge) throw new ApiFailure(404, 'CHALLENGE_NOT_FOUND', 'This challenge could not be found.')
  return challenge
}

function routeChallengeId(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    throw new ApiFailure(400, 'INVALID_INPUT', 'Use a valid challenge ID.')
  }
}

export function createApiHandler(options: ApiOptions = {}) {
  const evaluate = createEvaluator(options)
  const checkRateLimit = createEvaluationRateLimit()
  const getClientId = options.getClientId ?? (() => 'local')

  return async (request: Request): Promise<Response> => {
    try {
      const path = new URL(request.url).pathname.replace(/\/$/, '')
      if (path === '/api/health') {
        requireMethod(request, 'GET')
        return json({ status: 'ok' })
      }
      if (path === '/api/challenges') {
        requireMethod(request, 'GET')
        return json(challenges)
      }
      const challengeRoute = /^\/api\/challenges\/([^/]+)$/.exec(path)
      if (challengeRoute) {
        requireMethod(request, 'GET')
        return json(findChallenge(routeChallengeId(challengeRoute[1]!)))
      }
      if (path === '/api/evaluate') {
        requireMethod(request, 'POST')
        const body = await readJson(request)
        const parsed = evaluateRequestSchema.safeParse(body)
        if (!parsed.success) {
          const fieldErrors: Record<string, string> = {}
          for (const issue of parsed.error.issues) {
            if (issue.path.length) fieldErrors[issue.path.join('.')] ??= issue.message
          }
          throw new ApiFailure(400, 'INVALID_INPUT', 'Check the solution fields and submit again.', {
            fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
          })
        }
        const { challengeId, answers } = parsed.data
        const challenge = findChallenge(challengeId)
        checkRateLimit(getClientId(request))
        return json(await evaluate(challenge, answers))
      }
      throw new ApiFailure(404, 'NOT_FOUND', 'This endpoint could not be found.')
    } catch (error) {
      const failure = error instanceof ApiFailure
        ? error
        : new ApiFailure(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.')
      const body: ApiError = {
        error: {
          code: failure.code,
          message: failure.message,
          fieldErrors: failure.options.fieldErrors,
        },
      }
      return json(body, failure.status, failure.options.headers)
    }
  }
}

export const handleApiRequest = createApiHandler()
