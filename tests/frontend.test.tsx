// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../src/app/App.js'
import { challenges } from '../data/challenges/index.js'
import { answerKeys, answerLabels, criterionKeys } from '../shared/schemas.js'
import type { EvaluationResult, SolutionAnswers } from '../shared/types.js'
import { LEARNING_STORAGE_KEY } from '../src/features/attempts/learningStorage.js'

const challenge = challenges[0]!
const answers: SolutionAnswers = {
  problem: 'Families overlook produce when dinner plans change during the week.',
  targetUser: 'Adults who share meal planning and cook at home several times each week.',
  proposedSolution: 'A use-first list prompts the household to choose food before it spoils.',
  mvpFeatures: 'Quick item entry, a shared use-first list, and one optional reminder.',
  validationStrategy: 'Compare discarded produce during a two-week baseline and a four-week pilot.',
}

function evaluation(scores: [number, number, number, number, number]): EvaluationResult {
  const criteria = Object.fromEntries(criterionKeys.map((key, index) => [key, {
    score: scores[index],
    explanation: `The ${key} response is specific and testable.`,
    evidence: index === 0 ? ['dinner plans change'] : [],
    suggestions: ['Add one measurable decision threshold.'],
  }])) as EvaluationResult['criteria']

  return {
    totalScore: scores.reduce((total, score) => total + score, 0),
    criteria,
    strengths: ['Clear behavior.', 'Focused scope.', 'Measurable outcome.'],
    weaknesses: ['Recruitment is broad.', 'One trigger is unclear.', 'No decision threshold.'],
    nextSteps: ['Narrow recruitment.', 'Define the trigger.', 'Set a threshold.'],
    summary: 'The solution is testable and would benefit from a clearer threshold.',
  }
}

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
  window.dispatchEvent(new StorageEvent('storage', { key: LEARNING_STORAGE_KEY, newValue: null }))
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('functional frontend', () => {
  it('preserves answers through failure, saves revisions, compares attempts, and updates progress', async () => {
    const firstEvaluation = evaluation([12, 12, 12, 12, 12])
    const secondEvaluation = evaluation([10, 13, 12, 12, 12])
    let evaluationRequests = 0
    const evaluationRequestBodies: unknown[] = []
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const path = String(input)
      if (path === `/api/challenges/${challenge.id}`) return Response.json(challenge)
      if (path === '/api/challenges') return Response.json(challenges)
      if (path === '/api/evaluate') {
        expect(init?.method).toBe('POST')
        expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
        evaluationRequestBodies.push(JSON.parse(String(init?.body)))
        evaluationRequests += 1
        if (evaluationRequests === 1) {
          return Response.json({
            error: { code: 'PROVIDER_FAILURE', message: 'AI evaluation is temporarily unavailable.' },
          }, { status: 502 })
        }
        return Response.json(evaluationRequests === 2 ? firstEvaluation : secondEvaluation)
      }
      throw new Error(`Unexpected request: ${path}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderApp(`/challenges/${challenge.id}`)
    expect(await screen.findByRole('heading', { name: challenge.title, level: 1 })).toBeTruthy()

    const submit = screen.getByRole('button', { name: 'Submit Solution' })
    await user.click(submit)
    expect(screen.getAllByText('Enter an answer.')).toHaveLength(5)
    expect(document.activeElement).toBe(screen.getByLabelText(answerLabels.problem))

    for (const key of answerKeys) {
      await user.type(screen.getByLabelText(answerLabels[key]), answers[key])
    }
    expect(screen.getByText(`${answers.problem.length}/2000`)).toBeTruthy()
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(LEARNING_STORAGE_KEY) ?? '{}')
      expect(stored.drafts?.[challenge.id]).toEqual(answers)
    })

    const form = submit.closest('form')
    if (!form) throw new Error('Solution form was not rendered.')
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(await screen.findByText('AI evaluation is temporarily unavailable.')).toBeTruthy()
    expect(evaluationRequests).toBe(1)
    expect(evaluationRequestBodies).toEqual([{ challengeId: challenge.id, answers }])
    expect((screen.getByLabelText(answerLabels.problem) as HTMLTextAreaElement).value).toBe(answers.problem)

    await user.click(screen.getByRole('button', { name: 'Submit Solution' }))
    expect(await screen.findByRole('heading', { name: 'AI evaluation' })).toBeTruthy()
    expect(screen.getByText('60')).toBeTruthy()
    expect(screen.getByText(firstEvaluation.summary)).toBeTruthy()
    expect(screen.getByText('What worked')).toBeTruthy()
    expect(screen.getByText(firstEvaluation.strengths[0])).toBeTruthy()
    expect(screen.getByText('What needs work')).toBeTruthy()
    expect(screen.getByText(firstEvaluation.weaknesses[0])).toBeTruthy()
    expect(screen.getByText('Next steps')).toBeTruthy()
    expect(screen.getByText(firstEvaluation.nextSteps[0])).toBeTruthy()
    expect(screen.getByText(firstEvaluation.criteria.problemUnderstanding.explanation)).toBeTruthy()
    expect(screen.getByText(firstEvaluation.criteria.problemUnderstanding.evidence[0]!)).toBeTruthy()
    expect(screen.getAllByText(firstEvaluation.criteria.problemUnderstanding.suggestions[0]!)).toHaveLength(5)

    await user.click(screen.getByRole('button', { name: 'Improve My Solution' }))
    const revisedProblem = 'Households miss produce that becomes hidden after meal plans change.'
    const problemField = screen.getByLabelText(answerLabels.problem)
    expect((problemField as HTMLTextAreaElement).value).toBe(answers.problem)
    await user.clear(problemField)
    await user.type(problemField, revisedProblem)
    await user.click(screen.getByRole('button', { name: 'Submit Solution' }))

    const comparisonHeading = await screen.findByRole('heading', { name: 'Attempt comparison' })
    const comparison = comparisonHeading.closest('section')
    if (!comparison) throw new Error('Attempt comparison was not rendered.')
    expect(within(comparison).getByRole('row', { name: /Problem Understanding 12\/20 10\/20 -2/ })).toBeTruthy()
    expect(within(comparison).getByRole('row', { name: /Solution Quality 12\/20 12\/20 0/ })).toBeTruthy()
    expect(within(comparison).getByRole('row', { name: /Total 60\/100 59\/100 -1/ })).toBeTruthy()

    const savedState = JSON.parse(window.localStorage.getItem(LEARNING_STORAGE_KEY) ?? '{}')
    expect(savedState.attempts).toHaveLength(2)
    expect(savedState.attempts[0].answers.problem).toBe(revisedProblem)
    expect(evaluationRequestBodies[2]).toEqual({
      challengeId: challenge.id,
      answers: { ...answers, problem: revisedProblem },
    })

    await user.click(screen.getByRole('link', { name: 'View my progress' }))
    expect(await screen.findByRole('heading', { name: 'My progress' })).toBeTruthy()
    const totalAttempts = screen.getByText('Total attempts').parentElement
    if (!totalAttempts) throw new Error('Total attempts metric was not rendered.')
    expect(within(totalAttempts).getByText('2')).toBeTruthy()
    const latestScore = screen.getByText('Latest score').parentElement
    if (!latestScore) throw new Error('Latest score metric was not rendered.')
    expect(within(latestScore).getByText('59/100')).toBeTruthy()
  })

  it('presents pricing honestly and handles unknown routes', async () => {
    renderApp('/pricing')
    expect(screen.getByRole('heading', { name: 'Free' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeTruthy()
    expect(screen.getByText('$12.99')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Subscriptions unavailable' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/Pro is a product proposal only/)).toBeTruthy()

    cleanup()
    renderApp('/not-a-real-page')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeTruthy()
  })

  it('shows a dedicated state when a challenge does not exist', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({
      error: { code: 'CHALLENGE_NOT_FOUND', message: 'This challenge could not be found.' },
    }, { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    renderApp('/challenges/missing-challenge')
    expect(await screen.findByRole('heading', { name: 'Challenge not found' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Browse challenges' })).toBeTruthy()

    cleanup()
    fetchMock.mockResolvedValue(Response.json({
      error: { code: 'NOT_FOUND', message: 'The API route could not be found.' },
    }, { status: 404 }))
    renderApp('/challenges/missing-api-route')
    expect(await screen.findByText('The API route could not be found.')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Challenge not found' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })
})
