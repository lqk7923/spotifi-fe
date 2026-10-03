import { useEffect, useState } from 'react'
import { errorMessage, getAlbumTracks, getTracks } from '../lib/music-api.js'
import { filterTracks, getAlbums, trackKey } from '../lib/tracks.js'
import { navigate } from '../lib/navigation.js'

const LIKES_STORAGE_KEY = 'music-likes'

function readLikes() {
  try {
    const saved = JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) || '[]')
    return Array.isArray(saved) ? saved.filter((key) => typeof key === 'string') : []
  } catch {
    return []
  }
}

export default function useMusicLibrary(albumId) {
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [filters, setFilters] = useState({ scope: albumId, search: '', likedOnly: false })
  const search = filters.scope === albumId ? filters.search : ''
  const likedOnly = filters.scope === albumId ? filters.likedOnly : false
  const setSearch = (value) => setFilters({ scope: albumId, search: value, likedOnly })
  const [albumState, setAlbumState] = useState({ tracks: [], error: '' })
  const [albumReload, setAlbumReload] = useState(0)
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
    if (!albumId) return
    const controller = new AbortController()
    getAlbumTracks(albumId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setAlbumState({ albumId, reload: albumReload, tracks: result, error: '' })
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setAlbumState({ albumId, reload: albumReload, tracks: [], notFound: cause.status === 404, error: errorMessage(cause, 'Could not load this album.') })
        }
      })
    return () => controller.abort()
  }, [albumId, albumReload])

  useEffect(() => {
    try {
      localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes))
    } catch {
      // The library still works when browser storage is unavailable.
    }
  }, [likes])

  const refresh = () => {
    if (albumId) {
      setAlbumReload((value) => value + 1)
      return
    }
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
    setFilters({ scope: undefined, search: '', likedOnly: false })
    navigate('/')
  }

  const showLiked = () => {
    setFilters({ scope: undefined, search: '', likedOnly: !likedOnly })
    navigate('/')
  }

  const isLiked = (track) => !!track && likes.includes(trackKey(track))
  const albums = getAlbums(tracks)
  const albumReady = albumState.albumId === albumId && albumState.reload === albumReload
  const collectionTracks = albumId ? albumReady ? albumState.tracks : [] : tracks
  const selectedAlbum = albumId ? collectionTracks[0] || albums.find((album) => album.albumId === albumId) || { albumId } : null
  const visibleTracks = filterTracks(collectionTracks, { likedOnly, likes, search })
  const likedCount = tracks.filter(isLiked).length

  return {
    tracks, collectionTracks, visibleTracks, albums,
    loading: albumId ? !albumReady : loading,
    albumNotFound: !!albumId && albumReady && (albumState.notFound === true || (!albumState.error && !albumState.tracks.length)),
    error: albumId ? albumReady ? albumState.error : '' : error, refresh,
    selectedAlbum,
    search, setSearch, likedOnly, showLiked,
    isLiked, likedCount, toggleLike, resetFilters,
  }
}
