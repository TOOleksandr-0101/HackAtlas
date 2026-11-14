import { describe, expect, it, vi } from 'vitest'
import challengeFunction from '../api/challenges/[id].js'
import { challenges } from '../data/challenges/index.js'
import { createApiHandler } from '../server/app.js'
import type { EvaluationDiagnostic } from '../server/services/openrouter.js'
import { challengeListSchema, criterionKeys, evaluationResultSchema } from '../shared/schemas.js'
import type { CriterionEvaluation, SolutionAnswers } from '../shared/types.js'

const answers: SolutionAnswers = {
  problem: 'Dinner plans change, and thawed ingredients get overlooked.',
  targetUser: 'Families coordinating meals around changing work shifts.',
  proposedSolution: 'Send one reminder when a household has an ingredient that needs using.',
  mvpFeatures: 'Manual ingredient entry, a daily use-first reminder, and a discard log.',
  validationStrategy: 'Compare weekly discarded portions over two baseline and four pilot weeks.',
}
const env = { OPENROUTER_API_KEY: 'test-placeholder', OPENROUTER_MODEL: 'test/model' }
const firstChallenge = challenges[0]!
const silentLogger = () => undefined

function modelFeedback() {
  const scores = [12, 8, 19, 9, 10]
  const criteria = Object.fromEntries(criterionKeys.map((key, index) => {
    const feedback: CriterionEvaluation = {
      score: scores[index]!,
      explanation: 'The submission identifies a decision where food waste happens.',
      evidence: [],
      suggestions: ['Describe how often this happens.'],
    }
    return [key, feedback]
  }))
  return {
    criteria,
    strengths: ['Clear reason for waste.', 'Buildable scope.', 'Practical test window.'],
    weaknesses: ['Limited detail on households.', 'Trigger is underspecified.', 'No decision threshold.'],
    nextSteps: ['Name a sign-up channel.', 'Define the reminder trigger.', 'Set a success threshold.'],
    summary: 'Clarify the reminder trigger and test threshold.',
  }
}

function providerResponse(
  content = JSON.stringify(modelFeedback()),
  options: {
    finishReason?: string
    usage?: Record<string, unknown>
  } = {},
) {
  return Response.json({
    choices: [{ finish_reason: options.finishReason ?? 'stop', message: { content } }],
    ...(options.usage ? { usage: options.usage } : {}),
  })
}

function evaluationRequest(payload: unknown = { challengeId: firstChallenge.id, answers }) {
  return requestWithBody(JSON.stringify(payload))
}

function requestWithBody(body: string) {
  return new Request('http://localhost/api/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

describe('HackAtlas API', () => {
  it('serves health and the authoritative original challenge catalog without OpenRouter', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
    const api = createApiHandler({ env: {}, fetch })
    const health = await api(new Request('http://localhost/api/health'))
    expect(await health.json()).toEqual({ status: 'ok' })
    const catalog = await api(new Request('http://localhost/api/challenges'))
    const list = challengeListSchema.parse(await catalog.json())
    expect(list.map((challenge) => challenge.difficulty)).toEqual(['beginner', 'intermediate', 'advanced'])
    expect(new Set(list.map((challenge) => challenge.id)).size).toBe(3)

    const detail = await api(new Request(`http://localhost/api/challenges/${firstChallenge.id}`))
    expect(await detail.json()).toEqual(firstChallenge)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('reads the captured challenge ID when the Vercel function sees its internal pathname', async () => {
    const response = await challengeFunction.fetch(new Request(`https://example.com/api/challenges/[id]?id=${firstChallenge.id}`))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(firstChallenge)
  })

  it('runs a fresh mocked evaluation for each submission and calculates the total locally', async () => {
    const responses = [providerResponse(), providerResponse(JSON.stringify({
      ...modelFeedback(),
      criteria: {
        ...modelFeedback().criteria,
        problemUnderstanding: { ...modelFeedback().criteria.problemUnderstanding, score: 6 },
      },
    }))]
    const fetch = vi.fn<typeof globalThis.fetch>(async () => responses.shift()!)
    const api = createApiHandler({ env, fetch, logger: silentLogger })
    const first = await api(evaluationRequest({ challengeId: firstChallenge.id, answers: { ...answers, problem: `  ${answers.problem}  ` } }))
    const revision = { ...answers, problem: 'Meal plans change.' }
    const second = await api(evaluationRequest({ challengeId: firstChallenge.id, answers: revision }))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(evaluationResultSchema.parse(await first.json()).totalScore).toBe(58)
    expect(evaluationResultSchema.parse(await second.json()).totalScore).toBe(52)
    expect(fetch).toHaveBeenCalledTimes(2)

    const [url, request] = fetch.mock.calls[0]!
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
    const body = JSON.parse(request?.body as string)
    expect(body.model).toBe(env.OPENROUTER_MODEL)
    expect(body.provider).toEqual({ require_parameters: true })
    expect(body.response_format.type).toBe('json_schema')
    expect(body.max_completion_tokens).toBe(4_000)
    expect(body.messages[0].role).toBe('system')
    expect(body.messages[0].content).toContain(firstChallenge.rubric.problemUnderstanding.anchors.excellent)
    expect(body.messages[0].content).toContain('exactly these five keys')
    for (const key of criterionKeys) expect(body.messages[0].content).toContain(key)
    expect(body.messages[0].content).toContain('exactly one integer score from 0 through 20')
    expect(body.messages[0].content).toContain('exactly one nonempty concise explanation')
    expect(body.messages[0].content).toContain('zero to three nonempty short excerpts')
    expect(body.messages[0].content).toContain('one to three nonempty concrete actions')
    expect(body.messages[0].content).toContain('exactly three nonempty strengths')
    expect(body.messages[0].content).toContain('exactly three nonempty weaknesses')
    expect(body.messages[0].content).toContain('exactly three nonempty next steps')
    expect(body.messages[0].content).toContain('Return a nonempty summary')
    expect(body.messages[1]).toEqual({ role: 'user', content: JSON.stringify(answers) })
    expect(JSON.parse(fetch.mock.calls[1]![1]?.body as string).messages[1].content).toBe(JSON.stringify(revision))
  })

  it('rejects blank, oversized, malformed, and unknown submissions before contacting the provider', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
    const api = createApiHandler({ env, fetch, logger: silentLogger })
    const empty = await api(evaluationRequest({ challengeId: firstChallenge.id, answers: { ...answers, problem: '   ' } }))
    expect(empty.status).toBe(400)
    expect(await empty.json()).toMatchObject({ error: { code: 'INVALID_INPUT', fieldErrors: { 'answers.problem': 'Enter an answer.' } } })

    const malformed = await api(requestWithBody('{'))
    expect(malformed.status).toBe(400)
    expect(await malformed.json()).toMatchObject({ error: { code: 'INVALID_INPUT' } })
    const oversized = await api(requestWithBody('x'.repeat(64 * 1024 + 1)))
    expect(oversized.status).toBe(413)
    expect(await oversized.json()).toMatchObject({ error: { code: 'PAYLOAD_TOO_LARGE' } })

    const unknown = await api(evaluationRequest({ challengeId: 'unknown', answers }))
    expect(unknown.status).toBe(404)
    expect(await unknown.json()).toMatchObject({ error: { code: 'CHALLENGE_NOT_FOUND' } })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns 405 and Allow for an unsupported method', async () => {
    const api = createApiHandler()
    const response = await api(new Request('http://localhost/api/evaluate'))
    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('POST')
    expect(await response.json()).toMatchObject({ error: { code: 'METHOD_NOT_ALLOWED' } })
  })

  it('returns an actionable error when OpenRouter is unconfigured', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
    const response = await createApiHandler({ env: {}, fetch })(evaluationRequest())
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ error: { code: 'EVALUATION_NOT_CONFIGURED' } })
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    ['truncated JSON', '{"criteria":'],
    ['a missing criterion', (() => {
      const feedback = modelFeedback()
      const criteria = { ...feedback.criteria }
      delete criteria.validationStrategy
      return JSON.stringify({ ...feedback, criteria })
    })()],
    ['an invalid overview array length', JSON.stringify({ ...modelFeedback(), strengths: ['Only one.'] })],
    ['an invalid criterion array length', (() => {
      const feedback = modelFeedback()
      return JSON.stringify({
        ...feedback,
        criteria: {
          ...feedback.criteria,
          problemUnderstanding: { ...feedback.criteria.problemUnderstanding, suggestions: [] },
        },
      })
    })()],
    ['an invalid score', (() => {
      const feedback = modelFeedback()
      return JSON.stringify({
        ...feedback,
        criteria: {
          ...feedback.criteria,
          problemUnderstanding: { ...feedback.criteria.problemUnderstanding, score: 21 },
        },
      })
    })()],
    ['an unexpected extra field', JSON.stringify({ ...modelFeedback(), totalScore: 100 })],
  ])('rejects model output with %s without inventing feedback', async (_case, content) => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => providerResponse(content))
    const response = await createApiHandler({ env, fetch, retryDelayMs: 0, logger: silentLogger })(evaluationRequest())
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ error: { code: 'INVALID_MODEL_OUTPUT' } })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('retries one invalid evaluation once and accepts a valid retry', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(providerResponse('{"criteria":', { finishReason: 'length' }))
      .mockResolvedValueOnce(providerResponse())
    const response = await createApiHandler({ env, fetch, retryDelayMs: 0, logger: silentLogger })(evaluationRequest())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ totalScore: 58 })
    expect(fetch).toHaveBeenCalledTimes(2)
    const retryBody = JSON.parse(fetch.mock.calls[1]![1]?.body as string)
    expect(retryBody.messages[0].content).toContain('This is a clean retry.')
  })

  it('logs only safe completion metadata and validation diagnostics', async () => {
    const diagnostics: EvaluationDiagnostic[] = []
    const rawResponseMarker = 'RAW_MODEL_RESPONSE_SECRET'
    const answerMarker = 'USER_ANSWER_SECRET'
    const sensitiveEnv = { OPENROUTER_API_KEY: 'API_KEY_SECRET', OPENROUTER_MODEL: 'test/model' }
    const invalidFeedback = { ...modelFeedback(), strengths: [rawResponseMarker, 'Only two items.'] }
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(providerResponse(`{"summary":"${rawResponseMarker}"`, {
        usage: {
          prompt_tokens: 321,
          completion_tokens: 400,
          total_tokens: 721,
          prompt_tokens_details: { cached_tokens: 120 },
          completion_tokens_details: { reasoning_tokens: 80 },
        },
      }))
      .mockResolvedValueOnce(providerResponse(JSON.stringify(invalidFeedback)))
    const response = await createApiHandler({
      env: sensitiveEnv,
      fetch,
      retryDelayMs: 0,
      logger: (diagnostic) => diagnostics.push(diagnostic),
    })(evaluationRequest({ challengeId: firstChallenge.id, answers: { ...answers, problem: answerMarker } }))

    expect(response.status).toBe(502)
    expect(diagnostics).toContainEqual(expect.objectContaining({
      event: 'completion_received',
      attempt: 1,
      finishReason: 'stop',
      hasContent: true,
      usage: {
        promptTokens: 321,
        completionTokens: 400,
        totalTokens: 721,
        cachedTokens: 120,
        reasoningTokens: 80,
      },
    }))
    expect(diagnostics).toContainEqual(expect.objectContaining({ event: 'content_json_parse_failed', attempt: 1 }))
    expect(diagnostics).toContainEqual(expect.objectContaining({
      event: 'evaluation_schema_invalid',
      attempt: 2,
      issues: expect.arrayContaining([{ path: 'strengths', code: 'too_small' }]),
    }))

    const serialized = JSON.stringify(diagnostics)
    expect(serialized).not.toContain(sensitiveEnv.OPENROUTER_API_KEY)
    expect(serialized).not.toContain(answerMarker)
    expect(serialized).not.toContain(rawResponseMarker)
    expect(serialized).not.toContain(firstChallenge.rubric.problemUnderstanding.anchors.excellent)
  })

  it('retries transient provider failures once, then returns a sanitized error', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response('private provider details', { status: 503 }))
    const response = await createApiHandler({ env, fetch, retryDelayMs: 0, logger: silentLogger })(evaluationRequest())
    const body = await response.json()
    expect(response.status).toBe(502)
    expect(body).toMatchObject({ error: { code: 'PROVIDER_FAILURE' } })
    expect(JSON.stringify(body)).not.toContain('private provider details')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('recovers when the retry succeeds', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response('', { status: 502 }))
      .mockResolvedValueOnce(providerResponse())
    const response = await createApiHandler({ env, fetch, retryDelayMs: 0, logger: silentLogger })(evaluationRequest())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ totalScore: 58 })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('aborts timed out requests and reports a timeout after two attempts', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>((_url, request) => new Promise((_resolve, reject) => {
      request!.signal!.addEventListener('abort', () => reject(request!.signal!.reason), { once: true })
    }))
    const response = await createApiHandler({ env, fetch, timeoutMs: 15, retryDelayMs: 0, logger: silentLogger })(evaluationRequest())
    expect(response.status).toBe(504)
    expect(await response.json()).toMatchObject({ error: { code: 'PROVIDER_TIMEOUT' } })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('forwards safe retry timing on provider rate limits', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 429, headers: { 'Retry-After': '15' } }))
    const response = await createApiHandler({ env, fetch, logger: silentLogger })(evaluationRequest())
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('15')
    expect(await response.json()).toMatchObject({ error: { code: 'RATE_LIMITED' } })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('limits evaluations per client without sending excess requests to OpenRouter', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => providerResponse())
    const api = createApiHandler({ env, fetch, logger: silentLogger })
    for (let i = 0; i < 8; i += 1) expect((await api(evaluationRequest())).status).toBe(200)
    const response = await api(evaluationRequest())
    expect(response.status).toBe(429)
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect(await response.json()).toMatchObject({ error: { code: 'RATE_LIMITED' } })
    expect(fetch).toHaveBeenCalledTimes(8)
  })
})
