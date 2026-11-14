import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Attempt, EvaluationResult, SolutionAnswers } from '../shared/types.js'
import {
  addAttempt, emptyLearningState, LEARNING_STORAGE_KEY, parseLearningState, readDraft,
} from '../src/features/attempts/learningStorage.js'
import { calculateProgress, compareAttempts } from '../src/features/progress/learningProgress.js'

const challengeId = 'household-food-waste'
const answers: SolutionAnswers = {
  problem: 'People forget about produce before it spoils.',
  targetUser: 'Working adults who cook for their families.',
  proposedSolution: 'Suggest meals based on foods expiring soon.',
  mvpFeatures: 'Inventory, expiry reminders, and recipe suggestions.',
  validationStrategy: 'Compare the weight of wasted produce before and after a one-week pilot.',
}
const evaluation = (problemScore: number, audienceScore: number): EvaluationResult => {
  const criterion = { score: 10, explanation: 'The main idea is clear.', evidence: [], suggestions: ['Add detail.'] }
  return {
    totalScore: problemScore + audienceScore + 30,
    criteria: {
      problemUnderstanding: { ...criterion, score: problemScore },
      targetAudience: { ...criterion, score: audienceScore },
      solutionQuality: criterion,
      mvpFeasibility: criterion,
      validationStrategy: criterion,
    },
    strengths: ['Defined the audience.', 'Named an outcome.', 'Proposed a pilot.'],
    weaknesses: ['No recruiting plan.', 'No comparison group.', 'No success threshold.'],
    nextSteps: ['Plan recruiting.', 'Add a comparison group.', 'Define a success threshold.'],
    summary: 'Specify a measurable threshold for your pilot.',
  }
}
const attempt = (attemptNumber: number, feedback: EvaluationResult): Attempt => ({
  attemptNumber,
  challengeId,
  id: `attempt-${attemptNumber}`,
  createdAt: `2026-11-14T19:0${attemptNumber}:00.000Z`,
  answers,
  evaluation: feedback,
})
const first = attempt(1, evaluation(12, 8))
const revision = attempt(2, evaluation(9, 8))

describe('learning storage', () => {
  it('recovers from damaged JSON and unsupported storage versions', () => {
    expect(parseLearningState('{')).toEqual(emptyLearningState())
    expect(parseLearningState('{"version":2}')).toEqual(emptyLearningState())
  })

  it('preserves valid attempts and drafts in partially corrupted storage', () => {
    const draft = { ...answers, validationStrategy: '' }
    const stored = JSON.stringify({
      version: 1,
      drafts: { [challengeId]: draft, 'other-challenge': {}, ['__proto__']: draft },
      attempts: [first, { ...revision, evaluation: { ...revision.evaluation, totalScore: 100 } }, first],
    })

    const recovered = parseLearningState(stored)
    expect(recovered.attempts).toEqual([first])
    expect(readDraft(recovered, challengeId)).toEqual(draft)
    expect(readDraft(recovered, 'other-challenge')).toBeNull()
    expect(readDraft(recovered, '__proto__')).toBeNull()
    expect(readDraft(recovered, 'constructor')).toBeNull()
  })

  it('recovers one section when the other section has the wrong type', () => {
    const recovered = parseLearningState(JSON.stringify({ version: 1, drafts: [], attempts: [first] }))
    expect(recovered).toEqual({ version: 1, drafts: {}, attempts: [first] })
  })

  it('numbers attempts independently per challenge and trims submitted answers', () => {
    const data = { ...first, id: 'new-attempt', answers: { ...answers, problem: ` ${answers.problem} ` } }
    const { attemptNumber: _number, ...payload } = data
    const state = { ...emptyLearningState(), attempts: [revision, first] }
    expect(addAttempt(state, payload)).toMatchObject({ attemptNumber: 3, answers })
    expect(addAttempt(state, { ...payload, challengeId: 'another-challenge' }).attemptNumber).toBe(1)
  })
})

describe('learning progress', () => {
  it('reports negative, positive, and unchanged scores using actual evaluations', () => {
    const result = compareAttempts(first, attempt(2, evaluation(10, 9)))
    expect(result.totalDelta).toBe(-1)
    expect(result.criterionDeltas).toEqual({
      problemUnderstanding: -2,
      targetAudience: 1,
      solutionQuality: 0,
      mvpFeasibility: 0,
      validationStrategy: 0,
    })
  })

  it('aggregates all attempts and compares only consecutive attempts within a challenge', () => {
    const anotherChallenge = {
      ...attempt(1, evaluation(15, 15)), id: 'other-attempt', challengeId: 'freelancer-late-payments',
    }
    const progress = calculateProgress([revision, anotherChallenge, first])
    expect(progress).toMatchObject({
      challengesAttempted: 2,
      challengesCompleted: 2,
      totalAttempts: 3,
      latestScore: 47,
      bestScore: 60,
      averageScore: (47 + 60 + 50) / 3,
      criterionAverages: { problemUnderstanding: 12, solutionQuality: 10 },
      recentAttempts: [revision, anotherChallenge, first],
      history: [{ fromAttempt: first, toAttempt: revision, totalDelta: -3 }],
    })
  })

  it('reports missing scores for a first-time visitor', () => {
    expect(calculateProgress([])).toEqual({
      challengesAttempted: 0,
      challengesCompleted: 0,
      totalAttempts: 0,
      latestScore: null,
      bestScore: null,
      averageScore: null,
      criterionAverages: null,
      recentAttempts: [],
      history: [],
    })
  })
})

describe('browser learning store', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('persists attempts, preserves unsent edits, and restores state on reload', async () => {
    const saved = new Map<string, string>()
    const localStorage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => { saved.set(key, value) },
    }
    vi.stubGlobal('window', { localStorage, addEventListener: vi.fn() })
    const store = await import('../src/features/attempts/learningStore.js')
    const latestDraft = { ...answers, problem: 'An unsent revision.' }
    store.updateDraft(challengeId, latestDraft)
    expect(readDraft(store.getSnapshot().state, challengeId)).toEqual(latestDraft)

    // The first evaluation can finish while the learner has a newer draft.
    const initial = await store.saveAttempt(challengeId, answers, first.evaluation)
    expect(readDraft(store.getSnapshot().state, challengeId)).toEqual(latestDraft)
    const revised = await store.saveAttempt(challengeId, latestDraft, revision.evaluation)
    expect(readDraft(store.getSnapshot().state, challengeId)).toBeNull()
    expect(initial.attemptNumber).toBe(1)
    expect(revised.attemptNumber).toBe(2)
    expect(initial.id).not.toBe(revised.id)
    expect(saved.has(LEARNING_STORAGE_KEY)).toBe(true)

    vi.resetModules()
    const reloaded = await import('../src/features/attempts/learningStore.js')
    expect(reloaded.getSnapshot().state.attempts).toEqual([revised, initial])
  })

  it('keeps completed attempts accessible in memory when browser storage rejects writes', async () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => null,
        setItem: () => { throw new Error('Quota exceeded') },
      },
      addEventListener: vi.fn(),
    })
    const store = await import('../src/features/attempts/learningStore.js')
    const initial = await store.saveAttempt(challengeId, answers, first.evaluation)

    expect(store.getSnapshot().storageError).toMatch(/browser storage is unavailable/i)
    expect(store.getSnapshot().state.attempts).toEqual([initial])
  })
})
