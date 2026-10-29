import { isValidAlbum, isValidTrack, trackKey } from '../lib/tracks.js'
import { apiBase, apiRequest as request, catalogRequest } from './api-client.js'

function trackList(tracks) {
  if (!Array.isArray(tracks) || !tracks.every(isValidTrack)) {
    throw new Error('The music server returned an unexpected track list.')
  }
  return [...new Map(tracks.map((track) => [trackKey(track), track])).values()]
}

export async function getTracks(signal) {
  const tracks = []
  for (let page = 0; ; page++) {
    const response = await catalogRequest(`/tracks?page=${page}&size=20`, signal)
    const body = await response.json()
    const pagination = body?.pagination
    if (!pagination || pagination.page !== page || pagination.size !== 20
      || !Number.isSafeInteger(pagination.totalPages) || pagination.totalPages < 0
      || !Number.isSafeInteger(pagination.totalElements) || pagination.totalElements < 0
      || !Array.isArray(body.data) || body.data.length > 20
      || pagination.totalPages !== Math.ceil(pagination.totalElements / 20)
      || (page < pagination.totalPages - 1 && body.data.length !== 20)) {
      throw new Error('The music server returned unexpected pagination.')
    }
    tracks.push(...trackList(body.data))
    if (page + 1 >= pagination.totalPages) return trackList(tracks)
  }
}

/**
 * @param {string} albumId
 * @param {AbortSignal} [signal]
 * @returns {Promise<import('../lib/tracks.js').AlbumInfo>}
 */
export async function getAlbum(albumId, signal) {
  const response = await request(`/albums/${encodeURIComponent(albumId)}`, signal)
  const body = await response.json()
  const album = body?.data
  if (!isValidAlbum(album)) {
    throw new Error('The music server returned an unexpected album.')
  }
  return album
}

export async function getAlbumTracks(albumId, signal) {
  const response = await request(`/albums/${encodeURIComponent(albumId)}/tracks`, signal)
  const body = await response.json()
  return trackList(body?.data)
}

export async function getTrack(trackId, signal) {
  const response = await request(`/tracks/${encodeURIComponent(trackId)}`, signal)
  const body = await response.json()
  if (!isValidTrack(body?.data)) throw new Error('The music server returned an unexpected track.')
  return body.data
}

export async function getPlayback(track, signal, { includeMetadata = false } = {}) {
  const response = await request(
    `/tracks/${encodeURIComponent(track.trackId)}/playback${includeMetadata ? '?include=metadata' : ''}`,
    signal,
  )
  const body = await response.json().catch(() => null)
  const data = body?.data
  try {
    if (typeof data?.audioUrl !== 'string' || typeof data?.trackId !== 'string'
      || typeof data?.expiresAt !== 'string' || !Number.isFinite(Date.parse(data.expiresAt))) throw new Error()
    const audioUrl = data.audioUrl.trim()
    if (!['https:', 'http:'].includes(new URL(audioUrl).protocol)) throw new Error()
    if (includeMetadata && !isValidTrack(data.metadata)) throw new Error()
    return { ...data, audioUrl }
  } catch {
    throw new Error('The music server did not return a valid audio URL.')
  }
}

export async function getPlaybackUrl(track, signal) {
  return (await getPlayback(track, signal)).audioUrl
}

export function getSigningEndpoint(track) {
  return `${apiBase}/tracks/${encodeURIComponent(track.trackId)}/playback`
}

export function errorMessage(error, fallback) {
  if (error.name === 'TimeoutError') return 'The music server took too long to respond. Please try again.'
  if (error instanceof TypeError) return 'Cannot reach the music server. Please try again shortly.'
  return error.message || fallback
}
