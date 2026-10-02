const CACHE_NAME = 'spotifi-audio-prefix-v1'
const signatures = new Map()
const cacheOperations = new Map()

export function parseRange(header, total) {
  if (!header) return { start: 0, end: total - 1, partial: false }
  const match = header.match(/^bytes=(\d*)-(\d*)$/)
  if (!match || (!match[1] && !match[2])) return null
  const start = match[1] ? Number(match[1]) : Math.max(0, total - Number(match[2]))
  const end = match[1] && match[2] ? Math.min(Number(match[2]), total - 1) : total - 1
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 ||
      start > end || start >= total || (!match[1] && Number(match[2]) === 0)) return null
  return { start, end, partial: true }
}

async function freshSignature(source, force = false) {
  let current = signatures.get(source.path)
  if (!force && current && Date.now() - current.signedAt < 110_000) return current.url
  if (current?.pending) return current.pending
  if (!force && !current && Date.now() - source.signedAt < 110_000) return source.url
  current ||= {}
  current.pending = (async () => {
    const response = await fetch(source.signingEndpoint, { cache: 'no-store', signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw new Error('Could not refresh audio signature')
    const data = await response.json()
    if (typeof data?.trackPresignedLink !== 'string') throw new Error('Invalid audio URL')
    const url = data.trackPresignedLink.trim()
    if (!['http:', 'https:'].includes(new URL(url).protocol)) throw new Error('Invalid audio URL')
    current.url = url
    current.signedAt = Date.now()
    return url
  })().finally(() => { delete current.pending })
  signatures.set(source.path, current)
  return current.pending
}

async function fetchTail(source, start, end, signal) {
  const options = { headers: { Range: `bytes=${start}-${end}` }, signal, cache: 'no-store' }
  let response = await fetch(await freshSignature(source), options)
  if ([401, 403].includes(response.status)) {
    await response.body?.cancel()
    response = await fetch(await freshSignature(source, true), options)
  }
  // Never append a full 200 response or an inconsistent range to a cached prefix.
  if (response.status !== 206 ||
      response.headers.get('Content-Range') !== `bytes ${start}-${end}/${source.total}`) {
    await response.body?.cancel()
    throw new Error('Audio continuation did not match the requested range')
  }
  return response
}

export function createAudioResponse(request, source, loadTail = fetchTail) {
  const range = parseRange(request.headers.get('Range'), source.total)
  if (!range) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${source.total}` } })
  const { start, end, partial } = range
  const headers = {
    'Content-Type': source.type,
    'Content-Length': String(end - start + 1),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
  }
  if (partial) headers['Content-Range'] = `bytes ${start}-${end}/${source.total}`
  const controller = new AbortController()
  const signal = AbortSignal.any([request.signal, controller.signal])
  let offset = start
  let reader
  let remaining = end - Math.max(start, source.prefix.byteLength) + 1
  const stream = new ReadableStream({
    async pull(output) {
      try {
        signal.throwIfAborted()
        if (offset < source.prefix.byteLength) {
          const stop = Math.min(source.prefix.byteLength, end + 1)
          output.enqueue(new Uint8Array(source.prefix, offset, stop - offset))
          offset = stop
          if (offset > end) output.close()
          return
        }
        if (!reader) {
          const response = await loadTail(source, offset, end, signal)
          signal.throwIfAborted()
          reader = response.body.getReader()
        }
        const { value, done } = await reader.read()
        if (done) {
          if (remaining !== 0) throw new Error('Incomplete audio continuation')
          output.close()
        } else {
          remaining -= value.byteLength
          if (remaining < 0) throw new Error('Oversized audio continuation')
          output.enqueue(value)
        }
      } catch (cause) {
        controller.abort()
        await reader?.cancel().catch(() => {})
        output.error(cause)
      }
    },
    cancel() {
      controller.abort()
      return reader?.cancel()
    },
  })
  return new Response(stream, { status: partial ? 206 : 200, headers })
}

// Prefixes live in Cache Storage so a browser-terminated worker can resume playback.
// Only this namespace is intercepted; ordinary app/API requests pass through.
if (typeof self !== 'undefined' && self.clients) {
  self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()))
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
  self.addEventListener('message', (event) => {
    const data = event.data
    const owner = event.source?.id
    const prefix = new URL('__audio_preload__/', self.registration.scope).pathname
    if (!owner || typeof data?.path !== 'string' || !data.path.startsWith(prefix)) return
    // Keep store/release messages in order for each tab. A delayed old store
    // must finish before a new store can clean up that tab's previous prefix.
    const previous = cacheOperations.get(owner) || Promise.resolve()
    const operation = previous.catch(() => {}).then(async () => {
      const cache = await caches.open(CACHE_NAME)
      const key = new URL(data.path, self.location.origin).href
      if (data.type === 'store') {
        const live = new Set((await self.clients.matchAll()).map((client) => client.id))
        for (const request of await cache.keys()) {
          const stored = await cache.match(request)
          const storedOwner = stored.headers.get('X-Audio-Owner')
          if (storedOwner === owner || !live.has(storedOwner)) {
            await cache.delete(request)
            signatures.delete(new URL(request.url).pathname)
          }
        }
        await cache.put(key, new Response(data.prefix, { headers: {
          'Content-Type': data.audioType || 'application/octet-stream',
          'X-Audio-Type': data.audioType || 'application/octet-stream',
          'X-Audio-Owner': owner,
          'X-Audio-Total': String(data.total),
          'X-Audio-Url': data.url,
          'X-Audio-Signed-At': String(data.signedAt),
          'X-Audio-Signing-Endpoint': data.signingEndpoint,
        } }))
      } else if (data.type === 'release') {
        const stored = await cache.match(key)
        if (stored?.headers.get('X-Audio-Owner') === owner) {
          await cache.delete(key)
          signatures.delete(data.path)
        }
      }
      event.ports[0]?.postMessage({ ok: true })
    }).catch((cause) => event.ports[0]?.postMessage({ error: cause.message }))
      .finally(() => {
        if (cacheOperations.get(owner) === operation) cacheOperations.delete(owner)
      })
    cacheOperations.set(owner, operation)
    event.waitUntil(operation)
  })
  self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url)
    const prefix = new URL('__audio_preload__/', self.registration.scope).pathname
    if (url.origin !== self.location.origin || !url.pathname.startsWith(prefix) || event.request.method !== 'GET') return
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME)
      const stored = await cache.match(event.request.url)
      if (!stored || stored.headers.get('X-Audio-Owner') !== event.clientId) return new Response(null, { status: 404 })
      return createAudioResponse(event.request, {
        path: url.pathname,
        prefix: await stored.arrayBuffer(),
        total: Number(stored.headers.get('X-Audio-Total')),
        type: stored.headers.get('X-Audio-Type'),
        url: stored.headers.get('X-Audio-Url'),
        signedAt: Number(stored.headers.get('X-Audio-Signed-At')),
        signingEndpoint: stored.headers.get('X-Audio-Signing-Endpoint'),
      })
    })().catch(() => new Response(null, { status: 502 })))
  })
}
