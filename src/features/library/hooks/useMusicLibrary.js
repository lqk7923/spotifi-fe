import { useMemo } from 'react'
import { getAlbums } from '../../../lib/tracks.js'
import useTracks from './useTracks.js'
import useAlbum from './useAlbum.js'
import useLikedTracks from './useLikedTracks.js'

export default function useMusicLibrary({ page, albumId }, { status, user }, onRequireLogin) {
  const catalog = useTracks()
  const album = useAlbum(albumId)
  const liked = useLikedTracks(user)
  const { tracks } = catalog
  const albums = useMemo(() => getAlbums(tracks), [tracks])
  const likedOnly = page === 'liked-songs'
  const collection = albumId ? album : likedOnly ? liked : catalog
  const selectedAlbum = albumId
    ? album.album || albums.find(item => item.albumId === albumId) || { albumId }
    : null

  return {
    catalog, collectionTracks: collection.tracks, albums, selectedAlbum,
    loading: collection.loading || (likedOnly && status === 'loading'),
    error: collection.error,
    albumNotFound: album.notFound,
    requiresLogin: likedOnly ? status !== 'loading' && status !== 'authenticated' : album.requiresLogin,
    requestCollectionLogin: () => onRequireLogin(selectedAlbum),
    refresh: collection.refresh,
    refreshDisabled: likedOnly && liked.saving,
    likedOnly,
    isLiked: liked.isLiked, likedCount: liked.totalElements,
    isLikeDisabled: track => !!user && (!liked.canToggle || liked.isPending(track)),
    toggleLike: track => user ? liked.toggleLike(track) : onRequireLogin(track),
    likeError: liked.saveError, dismissLikeError: liked.clearSaveError,
  }
}
