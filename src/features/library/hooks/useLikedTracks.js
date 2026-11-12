import { useEffect, useRef, useState } from 'react'
import { trackKey } from '../../../lib/tracks.js'
import { errorMessage, getLikedTracks, setTrackLiked } from '../../../services/music-api.js'

const emptyTracks = []

export default function useLikedTracks(user) {
  const [result, setResult] = useState(null)
  const [reload, setReload] = useState(0)
  const [pending, setPending] = useState(new Set())
  const [saveError, setSaveError] = useState('')
  const writesRef = useRef(new Map())

  useEffect(() => {
    const writes = writesRef.current
    return () => {
      for (const controller of writes.values()) controller.abort()
      writes.clear()
    }
  }, [user])

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

  async function toggleLike(track) {
    const id = trackKey(track)
    const writes = writesRef.current
    if (!current?.ids || writes.has(id)) return
    const liked = !current.ids.has(id)
    const controller = new AbortController()
    writes.set(id, controller)
    setPending(new Set(writes.keys()))
    setSaveError('')

    try {
      await setTrackLiked(id, liked, controller.signal)
      if (controller.signal.aborted) return
      setResult(previous => {
        if (previous?.user !== user || previous.reload !== reload || previous.ids.has(id) === liked) return previous
        const ids = new Set(previous.ids)
        if (liked) ids.add(id)
        else ids.delete(id)
        const tracks = liked ? [track, ...previous.tracks] : previous.tracks.filter(item => trackKey(item) !== id)
        return { ...previous, tracks, ids, totalElements: previous.totalElements + (liked ? 1 : -1) }
      })
    } catch (cause) {
      if (!controller.signal.aborted) setSaveError(errorMessage(cause, 'Could not update your liked songs.'))
    } finally {
      if (writes.get(id) === controller) {
        writes.delete(id)
        setPending(new Set(writes.keys()))
      }
    }
  }

  return {
    tracks: current?.tracks ?? emptyTracks,
    totalElements: current?.totalElements ?? null,
    loading: !!user && !current,
    error: current?.error ?? '',
    refresh: () => { if (!writesRef.current.size) setReload(value => value + 1) },
    isLiked: track => !!track && current?.ids?.has(trackKey(track)) === true,
    canToggle: !!current?.ids,
    isPending: track => pending.has(trackKey(track)),
    saving: pending.size > 0,
    toggleLike, saveError, clearSaveError: () => setSaveError(''),
  }
}
