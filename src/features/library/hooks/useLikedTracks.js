import { useEffect, useState } from 'react'
import { trackKey } from '../../../lib/tracks.js'

const LIKES_STORAGE_KEY = 'music-likes'

function readLikes() {
  try {
    const saved = JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) || '[]')
    return Array.isArray(saved) ? saved.filter(key => typeof key === 'string') : []
  } catch {
    return []
  }
}

export default function useLikedTracks() {
  const [likes, setLikes] = useState(readLikes)

  useEffect(() => {
    try {
      localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes))
    } catch {
      // Likes remain usable when browser storage is unavailable.
    }
  }, [likes])

  const toggleLike = track => {
    const key = trackKey(track)
    setLikes(saved => saved.includes(key) ? saved.filter(value => value !== key) : [...saved, key])
  }

  return { likes, toggleLike, isLiked: track => !!track && likes.includes(trackKey(track)) }
}
