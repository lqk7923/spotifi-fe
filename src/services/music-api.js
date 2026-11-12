import { isValidAlbum, isValidTrack, trackKey } from '../lib/tracks.js'
import { apiBase, apiRequest as request, catalogRequest } from './api-client.js'

async function getPages(path, {
  signal, query, requestPage = request, kind = 'track', validate = isValidTrack, key = trackKey,
}) {
  const size = 20
  const items = new Map()
  const params = new URLSearchParams({ page: '0', size })
  if (query?.trim()) params.set('q', query.trim())
  for (let page = 0; ; page++) {
    params.set('page', page)
    const response = await requestPage(`${path}?${params}`, signal)
    const body = await response.json()
    const pagination = body?.pagination
    if (!pagination || pagination.page !== page || pagination.size !== size
      || !Number.isSafeInteger(pagination.totalPages) || pagination.totalPages < 0
      || !Number.isSafeInteger(pagination.totalElements) || pagination.totalElements < 0
      || !Array.isArray(body.data) || body.data.length > size
      || pagination.totalPages !== Math.ceil(pagination.totalElements / size)
      || (page < pagination.totalPages - 1 && body.data.length !== size)) {
      throw new Error('The music server returned unexpected pagination.')
    }
    if (!body.data.every(validate)) {
      throw new Error(`The music server returned an unexpected ${kind} list.`)
    }
    for (const item of body.data) items.set(key(item), item)
    if (page + 1 >= pagination.totalPages) {
      return { items: [...items.values()], totalElements: pagination.totalElements }
    }
  }
}

export async function getTracks(signal, query) {
  return (await getPages('/tracks', { requestPage: catalogRequest, signal, query })).items
}

export async function getLikedTracks(signal) {
  const { items, totalElements } = await getPages('/users/me/liked-music', { signal })
  return { tracks: items, totalElements }
}

export async function searchAlbums(query, signal) {
  return (await getPages('/albums', {
    signal, query, kind: 'album', validate: isValidAlbum, key: album => album.albumId,
  })).items
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
  return (await getPages(`/albums/${encodeURIComponent(albumId)}/tracks`, { signal })).items
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
