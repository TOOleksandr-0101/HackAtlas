import { z } from 'zod'
import { criterionKeys, modelEvaluationSchema } from '../../shared/schemas.js'
import type { Challenge, EvaluationResult, SolutionAnswers } from '../../shared/types.js'
import { evaluationInstructions } from '../prompts/evaluation.js'
import { ApiFailure } from '../utils/errors.js'

const endpoint = 'https://openrouter.ai/api/v1/chat/completions'
const transientStatuses = new Set([408, 500, 502, 503, 504, 522, 524, 529])
const maxAttempts = 2
const defaultAttemptTimeoutMs = 16_000
// Vercel allows this function 45 seconds. Two 16-second attempts plus backoff
// share this smaller budget so the function still has time to return an error.
const defaultEvaluationBudgetMs = 34_000
const maxCompletionTokens = 4_000

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
  totalTimeoutMs?: number
  retryDelayMs?: number
  logger?: EvaluationLogger
}

type TokenUsage = {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  cachedTokens?: number
  reasoningTokens?: number
}

type ValidationIssue = { path: string; code: string }

export type EvaluationDiagnostic = {
  event: string
  attempt: number
  finishReason?: string | null
  hasContent?: boolean
  usage?: TokenUsage
  issues?: ValidationIssue[]
  reason?: string
  remainingBudgetMs?: number
}

export type EvaluationLogger = (diagnostic: EvaluationDiagnostic) => void

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

function defaultLogger(diagnostic: EvaluationDiagnostic) {
  const message = JSON.stringify({ component: 'hackatlas-evaluator', ...diagnostic })
  if (diagnostic.event === 'completion_received') console.info(message)
  else console.warn(message)
}

function emitDiagnostic(logger: EvaluationLogger, diagnostic: EvaluationDiagnostic) {
  try {
    logger(diagnostic)
  } catch {
    // Diagnostics must never prevent an evaluation from completing.
  }
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function tokenCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined
}

function safeUsage(payload: unknown): TokenUsage | undefined {
  const usage = objectValue(objectValue(payload)?.usage)
  if (!usage) return undefined
  const promptDetails = objectValue(usage.prompt_tokens_details)
  const completionDetails = objectValue(usage.completion_tokens_details)
  const result: TokenUsage = {
    promptTokens: tokenCount(usage.prompt_tokens),
    completionTokens: tokenCount(usage.completion_tokens),
    totalTokens: tokenCount(usage.total_tokens),
    cachedTokens: tokenCount(promptDetails?.cached_tokens),
    reasoningTokens: tokenCount(completionDetails?.reasoning_tokens),
  }
  return Object.values(result).some((value) => value !== undefined) ? result : undefined
}

function safeFinishReason(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return /^[a-z0-9_-]{1,64}$/i.test(value) ? value : 'unrecognized'
}

function completionMetadata(payload: unknown) {
  const choices = objectValue(payload)?.choices
  const firstChoice = Array.isArray(choices) ? objectValue(choices[0]) : undefined
  const message = objectValue(firstChoice?.message)
  return {
    finishReason: safeFinishReason(firstChoice?.finish_reason),
    hasContent: typeof message?.content === 'string' && message.content.length > 0,
    usage: safeUsage(payload),
  }
}

const safePathSegments = new Set([
  'choices', 'finish_reason', 'message', 'content', 'criteria', ...criterionKeys,
  'score', 'explanation', 'evidence', 'suggestions', 'strengths', 'weaknesses', 'nextSteps', 'summary',
])

function validationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length
      ? issue.path.map((segment) => {
          if (typeof segment === 'number') return String(segment)
          return typeof segment === 'string' && safePathSegments.has(segment) ? segment : '<unknown>'
        }).join('.')
      : '$',
    code: issue.code,
  }))
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
  attempt: number,
  logger: EvaluationLogger,
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
    if (error instanceof SyntaxError) {
      emitDiagnostic(logger, { event: 'response_json_parse_failed', attempt })
      throw invalidModelOutput()
    }
    throw error
  }
  const providerError = providerErrorEnvelope.safeParse(payload)
  if (providerError.success) throw new ProviderFailure(providerError.data.error.code)
  return payload
}

function parseEvaluation(payload: unknown, attempt: number, logger: EvaluationLogger): EvaluationResult {
  const metadata = completionMetadata(payload)
  emitDiagnostic(logger, { event: 'completion_received', attempt, ...metadata })
  const envelope = completionEnvelope.safeParse(payload)
  if (!envelope.success) {
    emitDiagnostic(logger, {
      event: 'completion_envelope_invalid',
      attempt,
      issues: validationIssues(envelope.error),
    })
    throw invalidModelOutput()
  }
  const { finish_reason: finishReason, message } = envelope.data.choices[0]!
  if (finishReason === 'error') throw new ProviderFailure(502)
  if (!message.content || (finishReason && finishReason !== 'stop')) {
    emitDiagnostic(logger, {
      event: 'completion_rejected',
      attempt,
      reason: !message.content ? 'missing_content' : 'non_stop_finish_reason',
    })
    throw invalidModelOutput()
  }

  let content: unknown
  try {
    content = JSON.parse(message.content)
  } catch {
    emitDiagnostic(logger, { event: 'content_json_parse_failed', attempt })
    throw invalidModelOutput()
  }
  const parsed = modelEvaluationSchema.safeParse(content)
  if (!parsed.success) {
    emitDiagnostic(logger, {
      event: 'evaluation_schema_invalid',
      attempt,
      issues: validationIssues(parsed.error),
    })
    throw invalidModelOutput()
  }
  const totalScore = criterionKeys.reduce((total, key) => total + parsed.data.criteria[key].score, 0)
  return { ...parsed.data, totalScore }
}

export function createEvaluator(options: EvaluatorOptions = {}) {
  const env = options.env ?? process.env
  const fetcher = options.fetch ?? fetch
  const timeoutMs = Math.max(1, options.timeoutMs ?? defaultAttemptTimeoutMs)
  const totalTimeoutMs = Math.max(1, options.totalTimeoutMs ?? defaultEvaluationBudgetMs)
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? 400)
  const logger = options.logger ?? defaultLogger

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

    function requestBody(attempt: number) {
      const retryInstruction = attempt > 1
        ? '\n\nThis is a clean retry. Recheck every required key, score range, and array length before returning the JSON object.'
        : ''
      return JSON.stringify({
        model,
        messages: [
          { role: 'system', content: `${evaluationInstructions(challenge)}${retryInstruction}` },
          { role: 'user', content: JSON.stringify(answers) },
        ],
        response_format: responseFormat,
        provider: { require_parameters: true },
        temperature: 0,
        max_completion_tokens: maxCompletionTokens,
        stream: false,
      })
    }

    const startedAt = Date.now()
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const remainingBudgetMs = totalTimeoutMs - (Date.now() - startedAt)
      if (remainingBudgetMs <= 0) throw providerFailure(408)
      const signal = AbortSignal.timeout(Math.min(timeoutMs, remainingBudgetMs))
      try {
        const payload = await fetchCompletion(fetcher, headers, requestBody(attempt), signal, attempt, logger)
        return parseEvaluation(payload, attempt, logger)
      } catch (error) {
        const invalidOutput = error instanceof ApiFailure && error.code === 'INVALID_MODEL_OUTPUT'
        if (error instanceof ApiFailure && !invalidOutput) throw error
        const status = error instanceof ProviderFailure ? error.status : signal.aborted ? 408 : 502
        const retryAfter = error instanceof ProviderFailure ? error.retryAfter : undefined
        const retryable = invalidOutput || transientStatuses.has(status)
        const budgetBeforeRetry = totalTimeoutMs - (Date.now() - startedAt)
        if (attempt < maxAttempts && retryable && budgetBeforeRetry > retryDelayMs) {
          emitDiagnostic(logger, {
            event: 'retry_scheduled',
            attempt,
            reason: invalidOutput ? 'invalid_model_output' : signal.aborted ? 'timeout' : 'transient_provider_failure',
            remainingBudgetMs: budgetBeforeRetry,
          })
          if (retryDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
          continue
        }
        if (invalidOutput) throw error
        throw providerFailure(status, retryAfter)
      }
    }
    throw providerFailure(408)
  }
}
