import { useEffect, useState } from 'react'
import { migrateLikes, trackKey } from '../../../lib/tracks.js'
import { auth } from '../../../services/keycloak.js'

function readLikes(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]')
    return migrateLikes(saved)
  } catch {
    return []
  }
}

export default function useLikedTracks() {
  const storageKey = auth.getSnapshot().user.storageKey
  const [likes, setLikes] = useState(() => readLikes(storageKey))

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(likes))
    } catch {
      // Likes remain usable when browser storage is unavailable.
    }
  }, [likes, storageKey])

  const toggleLike = track => {
    const key = trackKey(track)
    setLikes(saved => saved.includes(key) ? saved.filter(value => value !== key) : [...saved, key])
  }

  return { likes, toggleLike, isLiked: track => !!track && likes.includes(trackKey(track)) }
}
