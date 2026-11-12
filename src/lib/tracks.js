/**
 * @typedef {Object} AlbumTrack
 * @property {string} trackId
 * @property {string} title
 * @property {number} durationMs Duration in milliseconds.
 */

/**
 * @typedef {Object} AlbumInfo
 * @property {string} albumId
 * @property {string} title
 * @property {string} artist
 * @property {string|null} coverUrl
 * @property {string|null} coverExpiresAt
 * @property {string|null} releaseDate
 * @property {'SINGLE'|'EP'|'LP'|null} albumType
 */

/**
 * Track metadata shared by the catalog, album, and liked-music endpoints.
 * @typedef {AlbumTrack & { artist: string, albumId: string, albumTitle: string }} Track
 */

export function trackKey(track) {
  return track.trackId
}

export function trackLabel(track) {
  return track.title?.trim() || `Track ${track.trackId.slice(0, 8)}`
}

export function trackAuthor(track) {
  return track.artist?.trim() || 'Unknown artist'
}

export function trackDurationSeconds(track) {
  // The API uses milliseconds; HTMLMediaElement and player controls use seconds.
  return Number.isFinite(track?.durationMs) && track.durationMs >= 0
    ? track.durationMs / 1000
    : null
}

export function isValidTrack(track) {
  if (!track || Array.isArray(track)) return false
  if (typeof track.trackId !== 'string' || !track.trackId) return false
  if (typeof track.albumId !== 'string' || !track.albumId.trim()) return false
  if (typeof track.albumTitle !== 'string') return false
  return typeof track.title === 'string' && typeof track.artist === 'string'
    && Number.isFinite(track.durationMs) && track.durationMs >= 0
}

/** @param {AlbumInfo} album */
export function isValidAlbum(album) {
  if (!album || Array.isArray(album)) return false
  if (typeof album.albumId !== 'string' || !album.albumId.trim()) return false
  return typeof album.title === 'string' && typeof album.artist === 'string'
}

/**
 * @param {Track[]} tracks
 * @returns {Track[]}
 */
export function getAlbumQueue(tracks) {
  return [...new Map(tracks.map((track) => [trackKey(track), track])).values()]
}

export function getAlbums(tracks) {
  const albums = new Map()
  for (const { albumId, albumTitle, coverUrl, coverExpiresAt } of tracks) {
    const previous = albums.get(albumId)
    albums.set(albumId, {
      albumId, title: albumTitle,
      coverUrl: coverUrl || previous?.coverUrl || null,
      coverExpiresAt: coverUrl ? coverExpiresAt : previous?.coverExpiresAt,
    })
  }
  return [...albums.values()]
}
