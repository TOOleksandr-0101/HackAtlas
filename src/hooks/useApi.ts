import { useCallback, useEffect, useRef, useState } from 'react'
import type { EvaluationResult, SolutionAnswers } from '../../shared/types.js'
import { api, type ApiRequestError, toApiRequestError } from '../lib/api.js'

type QueryState<T> = {
  loader: (signal: AbortSignal) => Promise<T>
  data: T | null
  error: ApiRequestError | null
}

function useApiQuery<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<QueryState<T> | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void loader(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ loader, data, error: null })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ loader, data: null, error: toApiRequestError(error) })
      },
    )
    return () => controller.abort()
  }, [loader, revision])

  const retry = useCallback(() => {
    setState(null)
    setRevision((current) => current + 1)
  }, [])
  const current = state?.loader === loader ? state : null
  return { data: current?.data ?? null, error: current?.error ?? null, isLoading: current === null, retry }
}

export function useChallenges() {
  return useApiQuery(api.getChallenges)
}

export function useChallenge(id: string) {
  const load = useCallback((signal: AbortSignal) => api.getChallenge(id, signal), [id])
  return useApiQuery(load)
}

export function useEvaluation() {
  const pending = useRef<Promise<EvaluationResult> | null>(null)
  const [isEvaluating, setEvaluating] = useState(false)
  const [error, setError] = useState<ApiRequestError | null>(null)

  const evaluate = useCallback((challengeId: string, answers: SolutionAnswers) => {
    if (pending.current) return pending.current
    setEvaluating(true)
    setError(null)
    const evaluation = api.evaluate(challengeId, answers)
      .catch((cause: unknown) => {
        const requestError = toApiRequestError(cause)
        setError(requestError)
        throw requestError
      })
      .finally(() => {
        pending.current = null
        setEvaluating(false)
      })
    pending.current = evaluation
    return evaluation
  }, [])

  const resetError = useCallback(() => setError(null), [])
  return { evaluate, isEvaluating, error, resetError }
}
