export function trackKey(track) {
  return `${track.bucketName}/${track.trackId}`
}

export function trackLabel(track) {
  return track.trackTitle?.trim() || `Track ${track.trackId.slice(0, 8)}`
}

export function trackAuthor(track) {
  return track.author?.trim() || track.bucketName
}

export function trackDurationSeconds(track) {
  // The API uses milliseconds; HTMLMediaElement and player controls use seconds.
  return Number.isFinite(track?.trackDuration) && track.trackDuration >= 0
    ? track.trackDuration / 1000
    : null
}

export function isValidTrack(track) {
  if (!track || typeof track.bucketName !== 'string' || !track.bucketName) return false
  if (typeof track.trackId !== 'string' || !track.trackId) return false
  if (track.trackTitle != null && typeof track.trackTitle !== 'string') return false
  if (track.author != null && typeof track.author !== 'string') return false
  if (track.trackDuration != null) {
    return Number.isFinite(track.trackDuration) && track.trackDuration >= 0
  }
  return true
}

export function filterTracks(tracks, { bucket, likedOnly, likes, search }) {
  const query = search.toLowerCase().trim()
  return tracks.filter((track) => {
    if (bucket && track.bucketName !== bucket) return false
    if (likedOnly && !likes.includes(trackKey(track))) return false
    const text = `${trackLabel(track)} ${trackAuthor(track)} ${track.trackId} ${track.bucketName}`
    return text.toLowerCase().includes(query)
  })
}
