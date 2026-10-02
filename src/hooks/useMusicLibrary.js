import { useEffect, useState } from 'react'
import { errorMessage, getTracks } from '../lib/music-api.js'
import { filterTracks, trackKey } from '../lib/tracks.js'

const LIKES_STORAGE_KEY = 'music-likes'

function readLikes() {
  try {
    const saved = JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) || '[]')
    return Array.isArray(saved) ? saved.filter((key) => typeof key === 'string') : []
  } catch {
    return []
  }
}

export default function useMusicLibrary() {
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [search, setSearch] = useState('')
  const [bucket, setBucket] = useState('')
  const [likedOnly, setLikedOnly] = useState(false)
  const [likes, setLikes] = useState(readLikes)

  useEffect(() => {
    const controller = new AbortController()
    getTracks(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setTracks(result)
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(cause, 'Could not load your music.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [reload])

  useEffect(() => {
    try {
      localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes))
    } catch {
      // The library still works when browser storage is unavailable.
    }
  }, [likes])

  const refresh = () => {
    setLoading(true)
    setError('')
    setReload((value) => value + 1)
  }

  const toggleLike = (track) => {
    const key = trackKey(track)
    setLikes((saved) => saved.includes(key)
      ? saved.filter((value) => value !== key)
      : [...saved, key])
  }

  const resetFilters = () => {
    setSearch('')
    setBucket('')
    setLikedOnly(false)
  }

  const isLiked = (track) => !!track && likes.includes(trackKey(track))
  const buckets = [...new Set(tracks.map((track) => track.bucketName))]
  const visibleTracks = filterTracks(tracks, { bucket, likedOnly, likes, search })
  const likedCount = tracks.filter(isLiked).length

  return {
    tracks, visibleTracks, buckets, loading, error, refresh,
    search, setSearch, bucket, setBucket, likedOnly, setLikedOnly,
    isLiked, likedCount, toggleLike, resetFilters,
  }
}
