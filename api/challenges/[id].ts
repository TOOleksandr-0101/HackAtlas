import { handleApiRequest } from '../../server/app.js'

export default {
  fetch(request: Request) {
    const url = new URL(request.url)
    // Vercel's dynamic route also passes the captured segment in the query string.
    if (/^\/api\/challenges\/(?:\[id\]|%5Bid%5D)(?:\.ts)?$/i.test(url.pathname)) {
      const id = url.searchParams.get('id')
      if (id) {
        url.pathname = `/api/challenges/${encodeURIComponent(id)}`
        return handleApiRequest(new Request(url, { method: request.method }))
      }
    }
    return handleApiRequest(request)
  },
}
