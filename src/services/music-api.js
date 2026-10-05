import { isValidAlbum, isValidTrack, trackKey } from '../lib/tracks.js'

// Accept a backend root or the previously documented /track prefix.
const apiBase = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/+$/, '').replace(/\/track$/, '')

async function request(path, signal) {
  const response = await fetch(`${apiBase}${path}`, {
    cache: 'no-store',
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
  })
  if (!response.ok) {
    const error = new Error(`The music server returned an error (${response.status}). Please try again.`)
    error.status = response.status
    throw error
  }
  return response
}

async function getTrackList(path, signal) {
  const response = await request(path, signal)
  const tracks = await response.json()
  if (!Array.isArray(tracks) || !tracks.every(isValidTrack)) {
    throw new Error('The music server returned an unexpected track list.')
  }
  return [...new Map(tracks.map((track) => [trackKey(track), track])).values()]
}

export function getTracks(signal) {
  return getTrackList('/track/all', signal)
}

/**
 * @param {string} albumId
 * @param {AbortSignal} [signal]
 * @returns {Promise<import('../lib/tracks.js').AlbumInfo>}
 */
export async function getAlbumTracks(albumId, signal) {
  const response = await request(`/album/${encodeURIComponent(albumId)}/tracks`, signal)
  const album = await response.json()
  if (!isValidAlbum(album)) {
    throw new Error('The music server returned an unexpected album.')
  }
  return album
}

export async function getTrackLinks(track, signal) {
  const response = await request(
    `/track/track/${encodeURIComponent(track.trackId)}`,
    signal,
  )
  return response.json()
}

export async function getPlaybackUrl(track, signal) {
  const data = await getTrackLinks(track, signal).catch(error => {
    if (error instanceof SyntaxError) throw new Error('The music server did not return a valid audio URL.')
    throw error
  })
  let url
  let parsed
  try {
    if (typeof data?.trackPresignedLink !== 'string') throw new Error('Missing audio URL')
    url = data.trackPresignedLink.trim()
    parsed = new URL(url)
  } catch {
    throw new Error('The music server did not return a valid audio URL.')
  }
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    throw new Error('The music server did not return a valid audio URL.')
  }
  return url
}

export function getSigningEndpoint(track) {
  return `${apiBase}/track/track/${encodeURIComponent(track.trackId)}`
}

export function errorMessage(error, fallback) {
  if (error.name === 'TimeoutError') return 'The music server took too long to respond. Please try again.'
  if (error instanceof TypeError) return 'Cannot reach the music server. Please try again shortly.'
  return error.message || fallback
}
