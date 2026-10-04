import { filterTracks, getAlbums } from '../../../lib/tracks.js'
import useTracks from './useTracks.js'
import useAlbum from './useAlbum.js'
import useLibraryFilters from './useLibraryFilters.js'
import useLikedTracks from './useLikedTracks.js'

export default function useMusicLibrary(albumId) {
  const catalog = useTracks()
  const album = useAlbum(albumId)
  const filters = useLibraryFilters(albumId)
  const { likes, isLiked, toggleLike } = useLikedTracks()
  const { tracks } = catalog
  const albums = getAlbums(tracks)
  const collectionTracks = albumId ? album.tracks : tracks
  const selectedAlbum = albumId
    ? album.album || albums.find(item => item.albumId === albumId) || { albumId }
    : null

  return {
    tracks, collectionTracks, albums, selectedAlbum,
    visibleTracks: filterTracks(collectionTracks, { ...filters, likes }),
    loading: albumId ? album.loading : catalog.loading,
    error: albumId ? album.error : catalog.error,
    albumNotFound: album.notFound,
    refresh: albumId ? album.refresh : catalog.refresh,
    ...filters,
    isLiked, toggleLike, likedCount: tracks.filter(isLiked).length,
  }
}
