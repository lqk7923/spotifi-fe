import { useEffect, useState } from 'react'
import { errorMessage, getAlbumTracks } from '../../../services/music-api.js'
import { getAlbumQueue } from '../../../lib/tracks.js'

export default function useAlbum(albumId) {
  const [state, setState] = useState({ album: null, tracks: [], error: '' })
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!albumId) return
    const controller = new AbortController()
    getAlbumTracks(albumId, controller.signal)
      .then(result => {
        if (!controller.signal.aborted) {
          setState({ albumId, reload, album: result, tracks: getAlbumQueue(result), error: '' })
        }
      })
      .catch(cause => {
        if (!controller.signal.aborted) {
          setState({ albumId, reload, album: null, tracks: [], notFound: cause.status === 404,
            error: errorMessage(cause, 'Could not load this album.') })
        }
      })
    return () => controller.abort()
  }, [albumId, reload])

  const ready = state.albumId === albumId && state.reload === reload
  return {
    album: ready ? state.album : null,
    tracks: ready ? state.tracks : [],
    loading: !!albumId && !ready,
    notFound: !!albumId && ready && state.notFound === true,
    error: ready ? state.error : '',
    refresh: () => setReload(value => value + 1),
  }
}
