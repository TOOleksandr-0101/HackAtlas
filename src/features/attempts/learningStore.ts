import { answerKeys, solutionAnswersSchema } from '../../../shared/schemas.js'
import type { Attempt, EvaluationResult, SolutionAnswers } from '../../../shared/types.js'
import {
  addAttempt, challengeIdSchema, draftAnswersSchema, emptyLearningState, LEARNING_STORAGE_KEY,
  parseLearningState, readDraft, type LearningState,
} from './learningStorage.js'

type Snapshot = { state: LearningState; storageError: string | null }

const serverSnapshot: Snapshot = { state: emptyLearningState(), storageError: null }
const storageWarning = 'Browser storage is unavailable. Changes are kept in this tab until it closes.'
const listeners = new Set<() => void>()
const pendingDrafts = new Map<string, SolutionAnswers>()
let committed = emptyLearningState()
let snapshot = serverSnapshot
let storageError: string | null = null
let sessionOnly = false
let queue: Promise<void> = Promise.resolve()

function publish() {
  snapshot = {
    state: pendingDrafts.size
      ? { ...committed, drafts: { ...committed.drafts, ...Object.fromEntries(pendingDrafts) } }
      : committed,
    storageError,
  }
  for (const listener of listeners) listener()
}

function readStorage() {
  if (sessionOnly) return
  try {
    committed = parseLearningState(window.localStorage.getItem(LEARNING_STORAGE_KEY))
    storageError = null
  } catch {
    storageError = storageWarning
  }
}

function writeStorage(next: LearningState) {
  committed = next
  if (!sessionOnly) {
    try {
      window.localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(next))
      storageError = null
    } catch {
      // Keep subsequent changes in memory so this tab cannot overwrite newer
      // browser storage from another tab after losing synchronization.
      storageError = storageWarning
      sessionOnly = true
    }
  }
  publish()
}

function synchronize(event: StorageEvent) {
  if (event.key !== LEARNING_STORAGE_KEY && event.key !== null) return
  readStorage()
  publish()
}

if (typeof window !== 'undefined') {
  readStorage()
  publish()
  window.addEventListener('storage', synchronize)
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export const getSnapshot = () => snapshot
export const getServerSnapshot = () => serverSnapshot

async function lockStorage<T>(commit: () => T): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) return commit()

  let acquired = false
  try {
    return await navigator.locks.request(LEARNING_STORAGE_KEY, () => {
      acquired = true
      return commit()
    })
  } catch (error) {
    if (acquired) throw error
    return commit()
  }
}

function commitChanges<T>(update: () => T): Promise<T> {
  const result = queue.then(() => lockStorage(() => {
    readStorage()
    return update()
  }))
  queue = result.then(() => undefined, () => undefined)
  return result
}

export function updateDraft(challengeId: string, answers: SolutionAnswers): void {
  const id = challengeIdSchema.parse(challengeId)
  const draft = draftAnswersSchema.parse(answers)
  pendingDrafts.set(id, draft)
  publish()

  void commitChanges(() => {
    // Multiple keystrokes can arrive while another tab holds the lock.
    if (pendingDrafts.get(id) !== draft) return
    pendingDrafts.delete(id)
    writeStorage({ ...committed, drafts: { ...committed.drafts, [id]: draft } })
  })
}

export async function saveAttempt(
  challengeId: string,
  answers: SolutionAnswers,
  evaluation: EvaluationResult,
): Promise<Attempt> {
  return commitChanges(() => {
    const attempt = addAttempt(committed, {
      id: createAttemptId(),
      challengeId,
      createdAt: new Date().toISOString(),
      answers,
      evaluation,
    })
    const drafts = { ...committed.drafts }
    const draft = solutionAnswersSchema.safeParse(readDraft(committed, challengeId))
    if (draft.success && answerKeys.every((key) => draft.data[key] === attempt.answers[key])) {
      delete drafts[challengeId]
    }

    writeStorage({ version: 1, drafts, attempts: [attempt, ...committed.attempts] })
    return attempt
  })
}

function createAttemptId(): string {
  // getRandomValues is available when serving the local app via plain HTTP.
  if (typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID()
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
