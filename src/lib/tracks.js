/**
 * @typedef {Object} AlbumTrack
 * @property {string} trackId
 * @property {string} trackTitle
 * @property {number} trackDuration Duration in milliseconds.
 */

/**
 * @typedef {Object} AlbumInfo
 * @property {string} albumId
 * @property {string} albumTitle
 * @property {string} author
 * @property {string|null} albumCoverPresignedUrl
 * @property {string|null} releaseDate
 * @property {AlbumTrack[]} albumTracks
 */

/**
 * Track metadata from /track/all or inherited from the album for playback.
 * @typedef {AlbumTrack & { author: string, albumId: string, albumTitle: string }} Track
 */

export function trackKey(track) {
  return track.trackId
}

export function trackLabel(track) {
  return track.trackTitle?.trim() || `Track ${track.trackId.slice(0, 8)}`
}

export function trackAuthor(track) {
  return track.author?.trim() || 'Unknown artist'
}

export function trackDurationSeconds(track) {
  // The API uses milliseconds; HTMLMediaElement and player controls use seconds.
  return Number.isFinite(track?.trackDuration) && track.trackDuration >= 0
    ? track.trackDuration / 1000
    : null
}

export function isValidTrack(track) {
  if (!track || Array.isArray(track)) return false
  if (typeof track.trackId !== 'string' || !track.trackId) return false
  if (typeof track.albumId !== 'string' || !track.albumId.trim()) return false
  if (typeof track.albumTitle !== 'string') return false
  if (track.trackTitle != null && typeof track.trackTitle !== 'string') return false
  if (track.author != null && typeof track.author !== 'string') return false
  if (track.trackDuration != null) {
    return Number.isFinite(track.trackDuration) && track.trackDuration >= 0
  }
  return true
}

/** @param {AlbumInfo} album */
export function isValidAlbum(album) {
  if (!album || Array.isArray(album)) return false
  if (typeof album.albumId !== 'string' || !album.albumId.trim()) return false
  if (typeof album.albumTitle !== 'string' || typeof album.author !== 'string') return false
  return Array.isArray(album.albumTracks) && album.albumTracks.every((track) => (
    !!track && !Array.isArray(track)
    && typeof track.trackId === 'string' && !!track.trackId
    && typeof track.trackTitle === 'string'
    && Number.isFinite(track.trackDuration) && track.trackDuration >= 0
  ))
}

/**
 * @param {AlbumInfo} album
 * @returns {Track[]}
 */
export function getAlbumQueue(album) {
  const { albumId, albumTitle, author, albumCoverPresignedUrl } = album
  const tracks = album.albumTracks.map((track) => ({
    ...track, albumId, albumTitle, author,
    coverPresignedUrl: albumCoverPresignedUrl ?? track.coverPresignedUrl ?? null,
  }))
  return [...new Map(tracks.map((track) => [trackKey(track), track])).values()]
}

export function filterTracks(tracks, { likedOnly, likes, search }) {
  const query = search.toLowerCase().trim()
  return tracks.filter((track) => {
    if (likedOnly && !likes.includes(trackKey(track))) return false
    const text = `${trackLabel(track)} ${trackAuthor(track)} ${track.trackId} ${track.albumTitle} ${track.albumId}`
    return text.toLowerCase().includes(query)
  })
}

export function getAlbums(tracks) {
  const albums = new Map()
  for (const { albumId, albumTitle, author, coverPresignedUrl } of tracks) {
    const previous = albums.get(albumId)
    albums.set(albumId, {
      albumId, albumTitle, author,
      albumCoverPresignedUrl: coverPresignedUrl || previous?.albumCoverPresignedUrl || null,
    })
  }
  return [...albums.values()]
}

export function migrateLikes(saved) {
  return Array.isArray(saved)
    ? [...new Set(saved.filter(key => typeof key === 'string').map(key => key.split('/').at(-1)).filter(Boolean))]
    : []
}
