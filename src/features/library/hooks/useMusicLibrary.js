import { filterTracks, getAlbums } from '../../../lib/tracks.js'
import useTracks from './useTracks.js'
import useAlbum from './useAlbum.js'
import useLibraryFilters from './useLibraryFilters.js'
import useLikedTracks from './useLikedTracks.js'

export default function useMusicLibrary(albumId, user, onRequireLogin) {
  const catalog = useTracks()
  const album = useAlbum(albumId)
  const filters = useLibraryFilters(albumId)
  const liked = useLikedTracks(user)
  const { tracks } = catalog
  const albums = getAlbums(tracks)
  const collection = albumId ? album : filters.likedOnly ? liked : catalog
  const collectionTracks = collection.tracks
  const selectedAlbum = albumId
    ? album.album || albums.find(item => item.albumId === albumId) || { albumId }
    : null

  return {
    tracks, collectionTracks, albums, selectedAlbum,
    visibleTracks: filterTracks(collectionTracks, filters.search),
    loading: collection.loading,
    error: collection.error,
    albumNotFound: album.notFound,
    albumRequiresLogin: album.requiresLogin,
    requestAlbumLogin: () => onRequireLogin(selectedAlbum),
    refresh: collection.refresh,
    ...filters,
    isLiked: liked.isLiked, likedCount: liked.totalElements,
  }
}
