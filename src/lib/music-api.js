const apiBase = (import.meta.env?.VITE_API_BASE_URL || '/api-test').replace(/\/$/, '')

async function request(path, signal) {
  const response = await fetch(`${apiBase}${path}`, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
  })
  if (!response.ok) {
    throw new Error(`The music server returned an error (${response.status}). Please try again.`)
  }
  return response
}

export async function getTracks(signal) {
  const response = await request('/all', signal)
  const tracks = await response.json()
  if (!Array.isArray(tracks) || tracks.some((track) =>
    !track || typeof track.bucketName !== 'string' || !track.bucketName ||
    typeof track.trackId !== 'string' || !track.trackId)) {
    throw new Error('The music server returned an unexpected track list.')
  }
  return [...new Map(tracks.map((track) => [trackKey(track), track])).values()]
}

export async function getPlaybackUrl(track, signal) {
  const response = await request(
    `/${encodeURIComponent(track.bucketName)}/${encodeURIComponent(track.trackId)}`,
    signal,
  )
  const url = (await response.text()).trim()
  let parsed
  try { parsed = new URL(url) } catch {
    throw new Error('The music server did not return a valid audio URL.')
  }
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    throw new Error('The music server did not return a valid audio URL.')
  }
  return url
}

export function trackKey(track) {
  return `${track.bucketName}/${track.trackId}`
}

export function trackLabel(track) {
  return `Track ${track.trackId.slice(0, 8)}`
}

export function errorMessage(error, fallback) {
  if (error.name === 'TimeoutError') return 'The music server took too long to respond. Please try again.'
  if (error instanceof TypeError) return 'Cannot reach the music server. Please try again shortly.'
  return error.message || fallback
}
