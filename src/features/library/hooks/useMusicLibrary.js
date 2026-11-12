import { useMemo, useState } from 'react'
import { getAlbums } from '../../../lib/tracks.js'
import useTracks from './useTracks.js'
import useAlbum from './useAlbum.js'
import useLikedTracks from './useLikedTracks.js'

export default function useMusicLibrary(albumId, user, onRequireLogin) {
  const catalog = useTracks()
  const album = useAlbum(albumId)
  const [showingLiked, setShowingLiked] = useState(false)
  const liked = useLikedTracks(user)
  const { tracks } = catalog
  const albums = useMemo(() => getAlbums(tracks), [tracks])
  const likedOnly = !albumId && showingLiked
  const collection = albumId ? album : likedOnly ? liked : catalog
  const selectedAlbum = albumId
    ? album.album || albums.find(item => item.albumId === albumId) || { albumId }
    : null

  return {
    catalog, collectionTracks: collection.tracks, albums, selectedAlbum,
    loading: collection.loading,
    error: collection.error,
    albumNotFound: album.notFound,
    albumRequiresLogin: album.requiresLogin,
    requestAlbumLogin: () => onRequireLogin(selectedAlbum),
    refresh: collection.refresh,
    likedOnly,
    showAll: () => setShowingLiked(false),
    showLiked: () => setShowingLiked(true),
    isLiked: liked.isLiked, likedCount: liked.totalElements,
  }
}
