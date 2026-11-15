import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Attempt, EvaluationResult, SolutionAnswers } from '../shared/types.js'
import {
  addAttempt, emptyLearningState, LEARNING_STORAGE_KEY, parseLearningState, readDraft,
} from '../src/features/attempts/learningStorage.js'
import { getRevisionReminders } from '../src/features/attempts/revisionChecklist.js'
import { calculateLearningPath } from '../src/features/progress/learningPath.js'
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

type Scores = readonly [number, number, number, number, number]

function scoredEvaluation(scores: Scores): EvaluationResult {
  const criterion = { score: 10, explanation: 'The main idea is clear.', evidence: [], suggestions: ['Add detail.'] }
  return {
    totalScore: scores.reduce((total, score) => total + score, 0),
    criteria: {
      problemUnderstanding: { ...criterion, score: scores[0] },
      targetAudience: { ...criterion, score: scores[1] },
      solutionQuality: { ...criterion, score: scores[2] },
      mvpFeasibility: { ...criterion, score: scores[3] },
      validationStrategy: { ...criterion, score: scores[4] },
    },
    strengths: ['Defined the audience.', 'Named an outcome.', 'Proposed a pilot.'],
    weaknesses: ['No recruiting plan.', 'No comparison group.', 'No success threshold.'],
    nextSteps: ['Plan recruiting.', 'Add a comparison group.', 'Define a success threshold.'],
    summary: 'Specify a measurable threshold for your pilot.',
  }
}

function pathAttempt({
  challengeId: pathChallengeId,
  scores,
  attemptNumber = 1,
  createdAt = `2026-11-14T19:0${attemptNumber}:00.000Z`,
  id = `${pathChallengeId}-${attemptNumber}`,
}: {
  challengeId: string
  scores: Scores
  attemptNumber?: number
  createdAt?: string
  id?: string
}): Attempt {
  return {
    id,
    challengeId: pathChallengeId,
    attemptNumber,
    createdAt,
    answers,
    evaluation: scoredEvaluation(scores),
  }
}

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

  it('aggregates total scores across attempts and skill scores across latest attempts', () => {
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
      criterionAverages: { problemUnderstanding: 12, targetAudience: 11.5, solutionQuality: 10 },
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

describe('personalized learning path', () => {
  it('returns no recommendation without evaluated attempts', () => {
    expect(calculateLearningPath([])).toBeNull()
  })

  it('builds an actionable recommendation from a single attempt', () => {
    const result = calculateLearningPath([
      pathAttempt({ challengeId: 'food-waste', scores: [12, 8, 14, 16, 10] }),
    ])

    expect(result).toMatchObject({
      skill: 'targetAudience',
      score: 8,
      challengeId: 'food-waste',
      practiceTitle: 'Narrow the first customer segment',
    })
    expect(result?.description).toMatch(/urgent need/i)
  })

  it('uses only the latest attempt per challenge even when input is out of order', () => {
    const firstAttempt = pathAttempt({
      challengeId: 'food-waste', attemptNumber: 1, scores: [1, 20, 20, 20, 20],
    })
    const latestAttempt = pathAttempt({
      challengeId: 'food-waste', attemptNumber: 2, scores: [20, 20, 20, 20, 4],
    })

    const history = [firstAttempt, latestAttempt]
    expect(calculateLearningPath(history)).toMatchObject({
      skill: 'validationStrategy', score: 4, challengeId: 'food-waste',
    })
    expect(calculateProgress(history).criterionAverages).toEqual({
      problemUnderstanding: 20,
      targetAudience: 20,
      solutionQuality: 20,
      mvpFeasibility: 20,
      validationStrategy: 4,
    })
  })

  it('averages the five skills across the latest attempts for different challenges', () => {
    const result = calculateLearningPath([
      pathAttempt({ challengeId: 'food-waste', scores: [9, 12, 16, 16, 18] }),
      pathAttempt({ challengeId: 'late-payments', scores: [13, 4, 18, 16, 18] }),
    ])

    expect(result).toMatchObject({
      skill: 'targetAudience', score: 8, challengeId: 'late-payments',
    })
  })

  it('breaks skill and challenge ties deterministically regardless of input order', () => {
    const alpha = pathAttempt({ challengeId: 'alpha-challenge', scores: [6, 6, 15, 15, 15] })
    const zeta = pathAttempt({ challengeId: 'zeta-challenge', scores: [6, 6, 15, 15, 15] })
    const forward = calculateLearningPath([alpha, zeta])
    const reversed = calculateLearningPath([zeta, alpha])

    expect(forward).toEqual(reversed)
    expect(forward).toMatchObject({
      skill: 'problemUnderstanding', score: 6, challengeId: 'alpha-challenge',
    })
  })

  it('selects the weakest average rather than the lowest individual score', () => {
    const result = calculateLearningPath([
      pathAttempt({ challengeId: 'food-waste', scores: [0, 10, 20, 20, 20] }),
      pathAttempt({ challengeId: 'late-payments', scores: [20, 8, 20, 20, 20] }),
    ])

    expect(result).toMatchObject({
      skill: 'targetAudience', score: 9, challengeId: 'late-payments',
    })
  })

  it('recommends the attempted challenge with the lowest score in the weakest skill', () => {
    const result = calculateLearningPath([
      pathAttempt({ challengeId: 'food-waste', scores: [18, 7, 18, 18, 18] }),
      pathAttempt({ challengeId: 'late-payments', scores: [18, 3, 18, 18, 18] }),
      pathAttempt({ challengeId: 'event-no-shows', scores: [18, 11, 18, 18, 18] }),
    ])

    expect(result).toMatchObject({
      skill: 'targetAudience', score: 7, challengeId: 'late-payments',
    })
  })

  it('updates the recommendation after a successful revision', () => {
    const foodFirst = pathAttempt({
      challengeId: 'food-waste', attemptNumber: 1, scores: [15, 4, 15, 15, 9],
    })
    const freelancer = pathAttempt({
      challengeId: 'late-payments', scores: [15, 8, 15, 15, 8],
    })
    const beforeRevision = calculateLearningPath([foodFirst, freelancer])

    const foodRevision = pathAttempt({
      challengeId: 'food-waste', attemptNumber: 2, scores: [15, 18, 15, 15, 16],
    })
    const revisedAttempts = [foodRevision, freelancer, foodFirst]
    const afterRevision = calculateLearningPath(revisedAttempts)

    expect(beforeRevision).toMatchObject({
      skill: 'targetAudience', score: 6, challengeId: 'food-waste',
    })
    expect(afterRevision).toMatchObject({
      skill: 'validationStrategy', score: 12, challengeId: 'late-payments',
    })
    expect(calculateProgress(revisedAttempts).criterionAverages?.validationStrategy).toBe(afterRevision?.score)
  })

  it.each([
    ['problemUnderstanding', [1, 20, 20, 20, 20], 'Map the problem moment', /context|frequency|consequence/i],
    ['targetAudience', [20, 1, 20, 20, 20], 'Narrow the first customer segment', /urgent need/i],
    ['solutionQuality', [20, 20, 1, 20, 20], 'Trace pain to product action', /user pain/i],
    ['mvpFeasibility', [20, 20, 20, 1, 20], 'Cut the MVP to three essentials', /exclude/i],
    ['validationStrategy', [20, 20, 20, 20, 1], 'Design a measurable experiment', /hypothesis|metric|method/i],
  ] as const)('provides criterion-specific practice for %s', (skill, scores, title, description) => {
    const result = calculateLearningPath([pathAttempt({ challengeId: 'practice-case', scores })])
    expect(result).toMatchObject({ skill, practiceTitle: title })
    expect(result?.description).toMatch(description)
  })
})

describe('revision reminders', () => {
  it('uses the canonical weakest criterion and returns at most three existing suggestions', () => {
    const feedback = scoredEvaluation([5, 5, 12, 13, 14])
    feedback.criteria.problemUnderstanding.suggestions = [
      'Clarify the problem context.',
      'Describe how often it happens.',
      'Name the consequence.',
      'This fourth suggestion must not be shown.',
    ]
    feedback.criteria.targetAudience.suggestions = ['This tied criterion must not win.']

    expect(getRevisionReminders(feedback)).toEqual({
      criterion: 'problemUnderstanding',
      suggestions: [
        'Clarify the problem context.',
        'Describe how often it happens.',
        'Name the consequence.',
      ],
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
