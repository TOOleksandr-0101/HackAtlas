import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { readDraft } from '../features/attempts/learningStorage.js'
import {
  getServerSnapshot, getSnapshot, saveAttempt, subscribe, updateDraft,
} from '../features/attempts/learningStore.js'
import { calculateProgress, compareAttempts } from '../features/progress/learningProgress.js'
import type { SolutionAnswers } from '../../shared/types.js'

function useLearningStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useAttempts(challengeId?: string) {
  const { state, storageError } = useLearningStore()
  const attempts = useMemo(() => challengeId
    ? state.attempts.filter((attempt) => attempt.challengeId === challengeId)
    : state.attempts, [challengeId, state.attempts])
  const latest = attempts[0] ?? null
  const previous = latest
    ? attempts.find((attempt) => attempt.id !== latest.id && attempt.challengeId === latest.challengeId) ?? null
    : null
  const comparison = latest && previous ? compareAttempts(previous, latest) : null

  return { attempts, latest, previous, comparison, saveAttempt, storageError }
}

export function useDraft(challengeId: string) {
  const { state, storageError } = useLearningStore()
  const update = useCallback((answers: SolutionAnswers) => updateDraft(challengeId, answers), [challengeId])
  return { draft: readDraft(state, challengeId), updateDraft: update, storageError }
}

export function useProgress() {
  const { state, storageError } = useLearningStore()
  const progress = useMemo(() => calculateProgress(state.attempts), [state.attempts])
  return { progress, storageError }
}
