import { isIP } from 'node:net'
import { createApiHandler } from '../server/app.js'

export default {
  fetch: createApiHandler({
    getClientId: (request) => {
      const ip = request.headers.get('x-vercel-forwarded-for')?.trim().toLowerCase()
      return ip && isIP(ip) ? ip : 'vercel-unknown'
    },
  }),
}
