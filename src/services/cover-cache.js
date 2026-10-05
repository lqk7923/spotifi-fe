import { getAlbumTracks, getTrackLinks } from './music-api.js'

const CACHE_NAME = 'music-covers-v1'
const MAX_COVERS = 100
const MAX_MEMORY_COVERS = 32

export function coverUrl(item) {
  const value = item?.albumCoverPresignedUrl || item?.coverPresignedUrl || item?.coverPresignedLink
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value.trim())
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

// Signed query parameters expire; the stored image belongs to the object path.
export function coverCacheKey(url) {
  const key = new URL(url)
  for (const name of [...key.searchParams.keys()]) {
    if (/^x-amz-/i.test(name)) key.searchParams.delete(name)
  }
  key.hash = ''
  return key.href
}

async function renewCover(item) {
  if (item.trackId) return coverUrl(await getTrackLinks(item))
  if (item.albumId) return coverUrl(await getAlbumTracks(item.albumId))
  return null
}

export function createCoverCache({
  storage = globalThis.caches,
  fetcher = (...args) => fetch(...args),
  renew = renewCover,
} = {}) {
  const memory = new Map()
  const pending = new Map()

  async function readOrDownload(item, url, key) {
    let cache
    try {
      cache = await storage?.open(CACHE_NAME)
      const stored = await cache?.match(key)
      if (stored) return stored.blob()
    } catch {
      // Private browsing or a full disk must not prevent displaying covers.
    }

    const download = target => fetcher(target, { signal: AbortSignal.timeout(15000) })
    let response = await download(url)
    if (response.status === 401 || response.status === 403) {
      const refreshed = await renew(item)
      if (!refreshed) throw new Error('No album cover is available.')
      response = await download(refreshed)
    }
    if (!response.ok) throw new Error('Could not load the album cover.')
    const blob = await response.blob()
    if (!blob.size || (!blob.type.startsWith('image/') && blob.type !== 'application/octet-stream')) {
      throw new Error('The server did not return an image.')
    }
    try {
      if (cache) {
        await cache.put(key, new Response(blob))
        const keys = await cache.keys()
        await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_COVERS)).map(old => cache.delete(old)))
      }
    } catch {
      // Continue with the downloaded image if persistent caching is unavailable.
    }
    return blob
  }

  return {
    async load(item) {
      const url = coverUrl(item)
      if (!url) return null
      const key = coverCacheKey(url)
      if (memory.has(key)) {
        const blob = memory.get(key)
        memory.delete(key)
        memory.set(key, blob)
        return blob
      }
      if (!pending.has(key)) {
        const promise = readOrDownload(item, url, key).then(blob => {
          memory.set(key, blob)
          if (memory.size > MAX_MEMORY_COVERS) memory.delete(memory.keys().next().value)
          return blob
        }).finally(() => pending.delete(key))
        pending.set(key, promise)
      }
      return pending.get(key)
    },
  }
}

export const coverCache = createCoverCache()
