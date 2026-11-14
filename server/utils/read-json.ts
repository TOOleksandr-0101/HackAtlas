import { ApiFailure } from './errors.js'

export const MAX_BODY_BYTES = 64 * 1024

const tooLarge = () => new ApiFailure(413, 'PAYLOAD_TOO_LARGE', 'The submitted solution is too large.')
const unreadable = () => new ApiFailure(400, 'INVALID_INPUT', 'Send a valid JSON object.')

export async function readJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES) throw tooLarge()
  const contentType = request.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase()
  if (contentType !== 'application/json') throw unreadable()

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  try {
    reader = request.body?.getReader()
    if (!reader) throw unreadable()

    const decoder = new TextDecoder('utf-8', { fatal: true })
    let bytes = 0
    let body = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > MAX_BODY_BYTES) throw tooLarge()
      body += decoder.decode(value, { stream: true })
    }
    return JSON.parse(body + decoder.decode())
  } catch (error) {
    if (reader) void reader.cancel().catch(() => undefined)
    if (error instanceof ApiFailure) throw error
    throw unreadable()
  } finally {
    reader?.releaseLock()
  }
}
