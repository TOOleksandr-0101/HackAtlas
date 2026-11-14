import { Readable } from 'node:stream'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import type { Connect, Plugin } from 'vite'
import { createApiHandler } from './server/app.js'

function localApi(env: NodeJS.ProcessEnv): Plugin {
  const handleApi = createApiHandler({ env, getClientId: () => 'local' })
  const middleware: Connect.NextHandleFunction = async (incoming, outgoing, next) => {
    const path = incoming.url ?? '/'
    if (!/^\/api(?:[/?]|$)/.test(path)) {
      next()
      return
    }

    const method = incoming.method ?? 'GET'
    const headers = new Headers()
    for (const [key, value] of Object.entries(incoming.headers)) {
      for (const entry of [value ?? []].flat()) headers.append(key, entry)
    }
    const init: RequestInit & { duplex?: 'half' } = { method, headers }
    if (method !== 'GET' && method !== 'HEAD') {
      init.body = Readable.toWeb(incoming) as ReadableStream<Uint8Array>
      init.duplex = 'half'
    }

    try {
      const url = new URL(`http://localhost${path}`)
      const response = await handleApi(new Request(url, init))
      const body = method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer())
      outgoing.writeHead(response.status, Object.fromEntries(response.headers))
      outgoing.end(body)
    } catch {
      if (outgoing.headersSent) {
        outgoing.destroy()
        return
      }
      outgoing.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      outgoing.end(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be processed.' } }))
    }
  }

  return {
    name: 'hackatlas-local-api',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), localApi(loadEnv(mode, process.cwd(), ['OPENROUTER_', 'APP_URL']))],
}))
