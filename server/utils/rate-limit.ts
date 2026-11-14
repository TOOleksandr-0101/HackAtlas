import { ApiFailure } from './errors.js'

const windowMs = 60_000
const requestsPerWindow = 8
const maxTrackedClients = 2_048

export function createEvaluationRateLimit() {
  const clients = new Map<string, { count: number; resetAt: number }>()
  let nextSweep = 0

  return (clientId: string) => {
    const now = Date.now()
    if (now >= nextSweep) {
      for (const [id, window] of clients) {
        if (window.resetAt <= now) clients.delete(id)
      }
      nextSweep = now + windowMs
    }

    const current = clients.get(clientId)
    if (current && current.resetAt > now) {
      if (current.count >= requestsPerWindow) {
        const remaining = Math.ceil((current.resetAt - now) / 1_000)
        throw rateLimit(remaining)
      }
      current.count += 1
      return
    }

    if (!current && clients.size >= maxTrackedClients) throw rateLimit(60)
    clients.set(clientId, { count: 1, resetAt: now + windowMs })
  }
}

function rateLimit(seconds: number): ApiFailure {
  return new ApiFailure(429, 'RATE_LIMITED', 'You have submitted several solutions recently. Please try again shortly.', {
    headers: { 'Retry-After': String(seconds) },
  })
}
