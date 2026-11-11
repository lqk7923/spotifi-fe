import { useEffect, useState } from 'react'
import { trackKey } from '../../../lib/tracks.js'
import { errorMessage, getLikedTracks } from '../../../services/music-api.js'

const emptyTracks = []

export default function useLikedTracks(user) {
  const [result, setResult] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    getLikedTracks(controller.signal)
      .then(({ tracks, totalElements }) => {
        if (controller.signal.aborted) return
        setResult({ user, reload, tracks, totalElements, ids: new Set(tracks.map(trackKey)), error: '' })
      })
      .catch(cause => {
        if (controller.signal.aborted) return
        setResult({ user, reload, error: errorMessage(cause, 'Could not load your liked songs.') })
      })
    return () => controller.abort()
  }, [user, reload])

  const current = result && result.user === user && result.reload === reload ? result : null
  return {
    tracks: current?.tracks ?? emptyTracks,
    totalElements: current?.totalElements ?? null,
    loading: !!user && !current,
    error: current?.error ?? '',
    refresh: () => setReload(value => value + 1),
    isLiked: track => !!track && current?.ids?.has(trackKey(track)) === true,
  }
}
