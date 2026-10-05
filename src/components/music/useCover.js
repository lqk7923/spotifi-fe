import { useEffect, useState } from 'react'
import { coverCache, coverUrl } from '../../services/cover-cache.js'

export default function useCover(item) {
  const url = coverUrl(item)
  const trackId = item?.trackId
  const albumId = item?.albumId
  const identity = JSON.stringify([url, trackId, albumId])
  const [image, setImage] = useState(null)

  useEffect(() => {
    if (!url) return
    let active = true
    let objectUrl
    coverCache.load({ coverPresignedUrl: url, trackId, albumId }).then(async blob => {
      if (!active) return
      if (!blob) {
        setImage({ identity, src: null })
        return
      }
      objectUrl = URL.createObjectURL(blob)
      const preview = new Image()
      preview.src = objectUrl
      await preview.decode()
      if (active) setImage({ identity, src: objectUrl })
    }).catch(() => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      if (active) setImage({ identity, src: null })
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url, trackId, albumId, identity])

  if (!url) return { src: null, loading: false }
  return image?.identity === identity
    ? { src: image.src, loading: false }
    : { src: null, loading: true }
}
