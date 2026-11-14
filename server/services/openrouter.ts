import { z } from 'zod'
import { criterionKeys, modelEvaluationSchema } from '../../shared/schemas.js'
import type { Challenge, EvaluationResult, SolutionAnswers } from '../../shared/types.js'
import { evaluationInstructions } from '../prompts/evaluation.js'
import { ApiFailure } from '../utils/errors.js'

const endpoint = 'https://openrouter.ai/api/v1/chat/completions'
const transientStatuses = new Set([408, 500, 502, 503, 504, 522, 524, 529])

// Keep this routing schema to the strict structured-output subset shared by providers.
// The shared Zod schema below enforces score bounds, text limits, and item counts.
const stringValue = { type: 'string' }
const stringList = { type: 'array', items: stringValue }
function strictObject(properties: Record<string, unknown>) {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false }
}
const criterion = strictObject({
  score: { type: 'integer' },
  explanation: stringValue,
  evidence: stringList,
  suggestions: stringList,
})
const responseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'hackatlas_evaluation',
    strict: true,
    schema: strictObject({
      criteria: strictObject(Object.fromEntries(criterionKeys.map((key) => [key, criterion]))),
      strengths: stringList,
      weaknesses: stringList,
      nextSteps: stringList,
      summary: stringValue,
    }),
  },
}

const completionEnvelope = z.object({
  choices: z.array(z.object({
    finish_reason: z.string().optional(),
    message: z.object({ content: z.string().nullable() }),
  })).min(1),
})
const providerErrorEnvelope = z.object({ error: z.object({ code: z.number().int() }) })

export type EvaluatorOptions = {
  env?: NodeJS.ProcessEnv
  fetch?: typeof fetch
  timeoutMs?: number
  retryDelayMs?: number
}

class ProviderFailure extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter?: string,
  ) {
    super('The evaluation provider returned an error.')
  }
}

function invalidModelOutput(): ApiFailure {
  return new ApiFailure(502, 'INVALID_MODEL_OUTPUT', 'The evaluator returned incomplete feedback. Please submit your solution again.')
}

function retryAfterSeconds(value: string | undefined): number {
  if (!value) return 30
  const seconds = /^\d+$/.test(value) ? Number(value) : (Date.parse(value) - Date.now()) / 1_000
  if (!Number.isFinite(seconds)) return 30
  return Math.max(1, Math.ceil(seconds))
}

function providerFailure(status: number, retryAfter?: string): ApiFailure {
  if (status === 429) {
    return new ApiFailure(429, 'RATE_LIMITED', 'The evaluator is busy. Please wait before submitting again.', {
      headers: { 'Retry-After': String(retryAfterSeconds(retryAfter)) },
    })
  }
  if (status === 408 || status === 504 || status === 524) {
    return new ApiFailure(504, 'PROVIDER_TIMEOUT', 'The evaluator took too long to respond. Your answers can be submitted again.')
  }
  return new ApiFailure(502, 'PROVIDER_FAILURE', 'The evaluator is unavailable. Please try again later.')
}

async function fetchCompletion(
  fetcher: typeof fetch,
  headers: Record<string, string>,
  body: string,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetcher(endpoint, { method: 'POST', headers, body, signal, redirect: 'error' })
  if (!response.ok) {
    if (response.body) void response.body.cancel().catch(() => undefined)
    throw new ProviderFailure(response.status, response.headers.get('Retry-After') ?? undefined)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    if (error instanceof SyntaxError) throw invalidModelOutput()
    throw error
  }
  const providerError = providerErrorEnvelope.safeParse(payload)
  if (providerError.success) throw new ProviderFailure(providerError.data.error.code)
  return payload
}

function parseEvaluation(payload: unknown): EvaluationResult {
  const envelope = completionEnvelope.safeParse(payload)
  if (!envelope.success) throw invalidModelOutput()
  const { finish_reason: finishReason, message } = envelope.data.choices[0]!
  if (finishReason === 'error') throw providerFailure(502)
  if (!message.content || (finishReason && finishReason !== 'stop')) throw invalidModelOutput()

  let content: unknown
  try {
    content = JSON.parse(message.content)
  } catch {
    throw invalidModelOutput()
  }
  const parsed = modelEvaluationSchema.safeParse(content)
  if (!parsed.success) throw invalidModelOutput()
  const totalScore = criterionKeys.reduce((total, key) => total + parsed.data.criteria[key].score, 0)
  return { ...parsed.data, totalScore }
}

export function createEvaluator(options: EvaluatorOptions = {}) {
  const env = options.env ?? process.env
  const fetcher = options.fetch ?? fetch
  const timeoutMs = options.timeoutMs ?? 16_000
  const retryDelayMs = options.retryDelayMs ?? 400

  return async (challenge: Challenge, answers: SolutionAnswers): Promise<EvaluationResult> => {
    const apiKey = env.OPENROUTER_API_KEY?.trim()
    const model = env.OPENROUTER_MODEL?.trim()
    if (!apiKey || !model) {
      throw new ApiFailure(503, 'EVALUATION_NOT_CONFIGURED', 'AI evaluation is not set up yet. Your draft stays available.')
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-OpenRouter-Title': 'HackAtlas',
    }
    const appUrl = env.APP_URL?.trim()
    if (appUrl) headers['HTTP-Referer'] = appUrl

    const body = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: evaluationInstructions(challenge) },
        { role: 'user', content: JSON.stringify(answers) },
      ],
      response_format: responseFormat,
      provider: { require_parameters: true },
      temperature: 0,
      max_completion_tokens: 2_400,
      stream: false,
    })

    async function evaluateWithRetry(retry: boolean): Promise<EvaluationResult> {
      const signal = AbortSignal.timeout(timeoutMs)
      try {
        const payload = await fetchCompletion(fetcher, headers, body, signal)
        return parseEvaluation(payload)
      } catch (error) {
        if (error instanceof ApiFailure) throw error
        const status = error instanceof ProviderFailure ? error.status : signal.aborted ? 408 : 502
        const retryAfter = error instanceof ProviderFailure ? error.retryAfter : undefined
        if (retry && transientStatuses.has(status)) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
          return evaluateWithRetry(false)
        }
        throw providerFailure(status, retryAfter)
      }
    }

    return evaluateWithRetry(true)
  }
}
