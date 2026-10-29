import { useEffect, useState, useSyncExternalStore } from 'react'
import { errorMessage, getAlbum, getAlbumTracks } from '../../../services/music-api.js'
import { getAlbumQueue } from '../../../lib/tracks.js'
import { auth } from '../../../services/keycloak.js'

export default function useAlbum(albumId) {
  const { status } = useSyncExternalStore(auth.subscribe, auth.getSnapshot)
  const authenticated = status === 'authenticated'
  const [state, setState] = useState({ album: null, tracks: [], error: '' })
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!albumId || !authenticated) return
    const controller = new AbortController()
    Promise.all([getAlbum(albumId, controller.signal), getAlbumTracks(albumId, controller.signal)])
      .then(([album, tracks]) => {
        if (!controller.signal.aborted) {
          setState({ albumId, reload, status, album, tracks: getAlbumQueue(tracks), error: '' })
        }
      })
      .catch(cause => {
        if (!controller.signal.aborted) {
          setState({ albumId, reload, status, album: null, tracks: [], notFound: [400, 404].includes(cause.status),
            error: errorMessage(cause, 'Could not load this album.') })
        }
      })
    return () => controller.abort()
  }, [albumId, reload, authenticated, status])

  const ready = authenticated && state.status === status && state.albumId === albumId && state.reload === reload
  return {
    album: ready ? state.album : null,
    tracks: ready ? state.tracks : [],
    loading: !!albumId && (status === 'loading' || (authenticated && !ready)),
    requiresLogin: !!albumId && !authenticated && status !== 'loading',
    notFound: !!albumId && ready && state.notFound === true,
    error: ready ? state.error : '',
    refresh: () => setReload(value => value + 1),
  }
}
