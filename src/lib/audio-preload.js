import { getPlaybackUrl, getSigningEndpoint, trackKey } from './music-api.js'

// Decimal MB: preload bytes 0..2,499,999, then continue at byte 2,500,000.
export const PRELOAD_BYTES = 2_500_000
const SIGNED_URL_MAX_AGE = 110_000
let workerReady

function withTimeout(promise, milliseconds) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Audio preload timed out')), milliseconds) }),
  ]).finally(() => clearTimeout(timer))
}

async function joinPreload(entry, signal) {
  // A click must not wait for an entire 2.5 MB download on a slow connection.
  let timer
  let abort
  try {
    await Promise.race([
      entry.ready,
      new Promise((resolve) => { timer = setTimeout(resolve, 150) }),
      new Promise((_, reject) => {
        abort = () => reject(signal.reason)
        signal.addEventListener('abort', abort, { once: true })
      }),
    ])
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', abort)
    if (!entry.data) entry.controller.abort()
  }
}

function getWorker() {
  if (!globalThis.isSecureContext || !navigator.serviceWorker) return Promise.resolve(null)
  if (!workerReady) {
    workerReady = withTimeout((async () => {
      const base = import.meta.env?.BASE_URL || '/'
      await navigator.serviceWorker.register(`${base}audio-preload-worker.js`, { scope: base, type: 'module' })
      await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve, reject) => {
          const onChange = () => {
            if (navigator.serviceWorker.controller) { cleanup(); resolve() }
          }
          const timer = setTimeout(() => { cleanup(); reject(new Error('Audio worker unavailable')) }, 4000)
          const cleanup = () => {
            clearTimeout(timer)
            navigator.serviceWorker.removeEventListener('controllerchange', onChange)
          }
          navigator.serviceWorker.addEventListener('controllerchange', onChange)
          onChange()
        })
      }
      return navigator.serviceWorker.controller
    })(), 4000).catch(() => { workerReady = null; return null })
  }
  return workerReady
}

function send(worker, message, transfer = []) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Audio worker timed out')) }, 4000)
    channel.port1.onmessage = ({ data }) => {
      clearTimeout(timer)
      channel.port1.close()
      if (data.error) reject(new Error(data.error))
      else resolve(data)
    }
    try {
      worker.postMessage(message, [channel.port2, ...transfer])
    } catch (cause) {
      clearTimeout(timer)
      channel.port1.close()
      reject(cause)
    }
  })
}

export async function fetchPrefix(url, signal) {
  const response = await fetch(url, {
    headers: { Range: `bytes=0-${PRELOAD_BYTES - 1}` },
    signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]),
    cache: 'no-store',
  })
  const match = response.headers.get('Content-Range')?.match(/^bytes 0-(\d+)\/(\d+)$/)
  const total = Number(match?.[2])
  const end = Number(match?.[1])
  if (response.status !== 206 || !match || !Number.isSafeInteger(total) || total <= 0 ||
      end !== Math.min(PRELOAD_BYTES, total) - 1) {
    await response.body?.cancel()
    throw new Error('Audio server must expose Content-Range and honor byte ranges')
  }
  const prefix = await response.arrayBuffer()
  if (prefix.byteLength !== end + 1) throw new Error('Incomplete audio preload')
  return { prefix, total, audioType: response.headers.get('Content-Type') || 'application/octet-stream' }
}

// One upcoming track in memory; one playing track in the worker's bounded cache.
export class AudioPreloader {
  constructor() {
    this.next = null
    this.active = null
  }

  preload(track) {
    if (track && this.next?.key === trackKey(track)) return
    this.next?.controller.abort()
    this.next = null
    if (!track) return
    const entry = { key: trackKey(track), controller: new AbortController() }
    this.next = entry
    entry.ready = (async () => {
      entry.worker = await getWorker()
      if (!entry.worker || entry.controller.signal.aborted) return
      entry.url = await getPlaybackUrl(track, entry.controller.signal)
      entry.signedAt = Date.now()
      entry.data = await fetchPrefix(entry.url, entry.controller.signal)
    })().catch(() => { /* Optional preload must never interrupt current playback. */ })
  }

  async source(track, signal, bypass = false) {
    signal.throwIfAborted()
    const entry = !bypass && this.next?.key === trackKey(track) ? this.next : null
    if (entry) {
      this.next = null
      // Briefly join an almost-ready preload, otherwise use native playback.
      const abort = () => entry.controller.abort()
      signal.addEventListener('abort', abort, { once: true })
      try {
        await joinPreload(entry, signal)
        signal.throwIfAborted()
        if (entry.data) {
          const id = crypto.randomUUID()
          const base = import.meta.env?.BASE_URL || '/'
          const path = `${base}__audio_preload__/${id}`
          try {
            await send(entry.worker, {
              type: 'store', path, url: entry.url, signedAt: entry.signedAt,
              signingEndpoint: new URL(getSigningEndpoint(track), location.href).href,
              ...entry.data,
            }, [entry.data.prefix])
          } catch (cause) {
            void send(entry.worker, { type: 'release', path }).catch(() => {})
            throw cause
          }
          if (signal.aborted) {
            void send(entry.worker, { type: 'release', path }).catch(() => {})
            signal.throwIfAborted()
          }
          this.active = { worker: entry.worker, path }
          return { url: path, signedAt: entry.signedAt, cached: true }
        }
      } catch (cause) {
        signal.throwIfAborted()
        if (cause.name === 'AbortError') throw cause
        // Registration/cache failures use the ordinary signed URL player.
      } finally {
        signal.removeEventListener('abort', abort)
      }
      if (entry.url && Date.now() - entry.signedAt < SIGNED_URL_MAX_AGE) {
        return { url: entry.url, signedAt: entry.signedAt, cached: false }
      }
    }
    if (this.next?.key !== trackKey(track) || bypass) this.preload(null)
    const url = await getPlaybackUrl(track, signal)
    return { url, signedAt: Date.now(), cached: false }
  }

  release() {
    const active = this.active
    this.active = null
    if (active) void send(active.worker, { type: 'release', path: active.path }).catch(() => {})
  }

  dispose() {
    this.preload(null)
    this.release()
  }
}
