import { useEffect, useState } from 'react'
import { coverCacheKey, coverUrl } from '../../services/cover-cache.js'
import { coverColorCache } from '../../services/cover-color-cache.js'

export default function useBannerColor(item, defaultColor = '#242424') {
  const url = coverUrl(item)
  const key = url ? coverCacheKey(url) : null
  const trackId = item?.trackId
  const albumId = item?.albumId
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!url) return
    let active = true
    coverColorCache.load({ coverPresignedUrl: url, trackId, albumId }).then(color => {
      if (active && color) setResult({ key, color })
    }).catch(() => {
      // Keep the neutral background if the cover cannot be decoded.
    })
    return () => { active = false }
  }, [url, key, trackId, albumId])

  return (key && result?.key === key ? result.color : coverColorCache.peek(item)) || defaultColor
}
