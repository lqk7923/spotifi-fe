import { extractBannerColor } from '../lib/cover-colors.js'
import { coverCache, coverCacheKey, coverUrl } from './cover-cache.js'

const STORAGE_KEY = 'music-cover-colors-v2'
const MAX_COLORS = 100
const validColor = color => typeof color === 'string' && /^#[\da-f]{6}$/i.test(color)

export function createCoverColorCache({
  loadCover = item => coverCache.load(item),
  extract = extractBannerColor,
  getStorage = () => globalThis.localStorage,
} = {}) {
  const colors = new Map()
  const pending = new Map()
  let restored = false

  function restore() {
    if (restored) return
    restored = true
    try {
      const entries = JSON.parse(getStorage()?.getItem(STORAGE_KEY) || '[]')
      if (!Array.isArray(entries)) return
      for (const entry of entries.slice(-MAX_COLORS)) {
        if (Array.isArray(entry) && typeof entry[0] === 'string' && validColor(entry[1])) {
          colors.set(entry[0], entry[1])
        }
      }
    } catch {
      // Color extraction works even if browser storage is unavailable.
    }
  }

  return {
    peek(item) {
      restore()
      const url = coverUrl(item)
      return url ? colors.get(coverCacheKey(url)) : null
    },
    async load(item) {
      restore()
      const url = coverUrl(item)
      if (!url) return null
      const key = coverCacheKey(url)
      if (colors.has(key)) return colors.get(key)
      if (!pending.has(key)) {
        const promise = Promise.resolve().then(() => loadCover(item)).then(async blob => {
          const color = blob ? await extract(blob) : null
          if (!validColor(color)) return null
          colors.set(key, color)
          if (colors.size > MAX_COLORS) colors.delete(colors.keys().next().value)
          try {
            getStorage()?.setItem(STORAGE_KEY, JSON.stringify([...colors]))
          } catch {
            // Retain the in-memory color when persistent storage is full/blocked.
          }
          return color
        }).finally(() => pending.delete(key))
        pending.set(key, promise)
      }
      return pending.get(key)
    },
  }
}

export const coverColorCache = createCoverColorCache()
