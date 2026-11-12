import { useEffect, useState } from 'react'
import { errorMessage, getTracks, searchAlbums } from '../../services/music-api.js'

const empty = []

export default function useMusicSearch(query, user, catalog, catalogAlbums) {
  const [songs, setSongs] = useState(null)
  const [albums, setAlbums] = useState(null)
  const [reload, setReload] = useState(0)
  const term = query.trim()

  useEffect(() => {
    if (!term) return
    const controller = new AbortController()
    const { signal } = controller
    const load = async (request, publish, fallback) => {
      try {
        const items = await request
        if (!signal.aborted) publish({ term, user, reload, items, error: '' })
      } catch (cause) {
        if (!signal.aborted) publish({ term, user, reload, items: empty, error: errorMessage(cause, fallback) })
      }
    }
    const timer = setTimeout(() => {
      void load(getTracks(signal, term), setSongs, 'Could not search for songs.')
      if (user) void load(searchAlbums(term, signal), setAlbums, 'Could not search for albums.')
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [term, user, reload])

  const current = result => result?.term === term && result.user === user && result.reload === reload ? result : null
  const songResult = current(songs)
  const albumResult = current(albums)
  const songsLoading = !!term && !songResult
  const albumLoading = !!term && (user ? !albumResult : catalog.loading)
  const guestAlbums = !user && term && !catalog.loading && !catalog.error
    ? catalogAlbums.filter(album => album.title.toLowerCase().includes(term.toLowerCase()))
    : empty

  return {
    term,
    tracks: songResult?.items ?? empty,
    albums: user ? albumResult?.items ?? empty : guestAlbums,
    loading: songsLoading || albumLoading,
    songError: songResult?.error ?? '',
    error: songResult?.error || (user ? albumResult?.error : catalog.error) || '',
    refresh: () => {
      if (!user && catalog.error) catalog.refresh()
      setReload(value => value + 1)
    },
  }
}
