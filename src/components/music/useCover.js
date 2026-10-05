import { useEffect, useState } from 'react'
import { coverCache, coverUrl } from '../../services/cover-cache.js'

export default function useCover(item) {
  const url = coverUrl(item)
  const trackId = item?.trackId
  const albumId = item?.albumId
  const [image, setImage] = useState(null)

  useEffect(() => {
    if (!url) return
    let active = true
    let objectUrl
    coverCache.load({ coverPresignedUrl: url, trackId, albumId }).then(blob => {
      if (!active || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setImage({ source: url, objectUrl })
    }).catch(() => {
      // Keep the generated artwork when the cover is missing or unavailable.
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url, trackId, albumId])

  return image?.source === url ? image.objectUrl : null
}
