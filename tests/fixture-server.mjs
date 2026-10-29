// Local browser-test fixture only. Never used by the application by default.
import http from 'node:http'

const tracks = Array.from({ length: 9 }, (_, index) => ({
  coverExpiresAt: new Date(Date.now() + 120_000).toISOString(),
  coverUrl: `http://localhost:8081/covers/${index < 6 ? 1 : 2}.svg?X-Amz-Signature=fixture`,
  trackId: `${['550e8400', '7ab2c391', 'a83d1940', 'c982a01e', 'bd43d971', '42b7f310', 'e743bd82', '127cb894', '32c974bb'][index]}-e29b-41d4-a716-44665544000${index}`,
  title: index === 0 ? 'Industrial Drum' : `Sample Track ${index + 1}`,
  durationMs: 180000,
  artist: index === 0 ? 'looplicator' : `Sample Artist ${index + 1}`,
  albumId: `00000000-0000-0000-0000-00000000000${index < 6 ? 1 : 2}`,
  albumTitle: index < 6 ? 'Sample Album' : 'Weekend Album',
}))
let mode = 'normal'
const catalogTracks = () => (mode === 'mobile-library' ? tracks.map((track, index) => ({
  ...track, albumId: `00000000-0000-0000-0000-00000000000${index + 1}`,
  albumTitle: `Sample Album ${index + 1}`,
})) : tracks).map(track => ({ ...track, coverExpiresAt: new Date(Date.now() + 120_000).toISOString() }))
let requests = []
let audioRequests = []
const wave = Buffer.alloc(44 + 44100 * 2 * 180)
wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8)
wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22)
wave.writeUInt32LE(44100, 24); wave.writeUInt32LE(88200, 28)
wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34)
wave.write('data', 36); wave.writeUInt32LE(wave.length - 44, 40)

http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost:8081')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length')
  if (url.pathname === '/__test/state') {
    if (request.method === 'POST') {
      const chunks = []
      for await (const chunk of request) chunks.push(chunk)
      mode = JSON.parse(Buffer.concat(chunks).toString()).mode
      requests = []
      audioRequests = []
    }
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ mode, requests, audioRequests }))
    return
  }
  const json = (body, status = 200) => {
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    response.end(JSON.stringify(body))
  }
  const fail = (status, code, message) => json({ code, message }, status)
  if (url.pathname === '/tracks') {
    if (mode === 'list-error') return fail(500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred')
    const page = Number(url.searchParams.get('page') ?? 0)
    const size = Number(url.searchParams.get('size') ?? 20)
    if (!Number.isSafeInteger(page) || page < 0 || !Number.isSafeInteger(size) || size < 1 || size > 20) {
      return fail(400, 'BAD_REQUEST', 'Invalid request.')
    }
    const all = mode === 'empty' ? [] : mode === 'malformed' ? [null] : mode === 'paginated'
      ? Array.from({ length: 45 }, (_, index) => ({ ...tracks[index % tracks.length], trackId: '00000001-0000-0000-0000-' + String(index).padStart(12, '0') }))
      : catalogTracks()
    return json({ data: all.slice(page * size, (page + 1) * size),
      pagination: { page, size, totalElements: all.length, totalPages: Math.ceil(all.length / size) } })
  }
  if (/^\/(albums|tracks)\//.test(url.pathname) && !request.headers.authorization?.startsWith('Bearer ')) {
    return fail(401, 'UNAUTHORIZED', 'Authentication is required')
  }
  if (/^\/albums\/[^/]+(?:\/tracks)?$/.test(url.pathname)) {
    if (mode === 'album-not-found') return fail(404, 'RESOURCE_NOT_FOUND', 'Album not found')
    if (mode === 'album-error') return fail(500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred')
    const albumId = decodeURIComponent(url.pathname.split('/')[2])
    let albumTracks = catalogTracks().filter(track => track.albumId === albumId)
    const album = albumTracks[0]
    if (!album || mode === 'empty') return fail(404, 'RESOURCE_NOT_FOUND', 'Album not found')
    if (mode === 'album-switch') {
      await new Promise(resolve => setTimeout(resolve, 1200))
      if (albumId.endsWith('2')) albumTracks = albumTracks.slice(0, 1)
    }
    return json({ data: url.pathname.endsWith('/tracks') ? (mode === 'album-empty' ? [] : albumTracks) : {
      albumId: album.albumId, title: album.albumTitle, artist: 'Album artist',
      coverUrl: album.coverUrl, coverExpiresAt: album.coverExpiresAt, releaseDate: '2026-10-05',
    } })
  }
  if (/^\/tracks\/[^/]+(?:\/playback)?$/.test(url.pathname)) {
    const track = catalogTracks().find(track => track.trackId === decodeURIComponent(url.pathname.split('/')[2]))
    if (!track) return fail(404, 'RESOURCE_NOT_FOUND', 'Track not found')
    if (!url.pathname.endsWith('/playback')) return json({ data: track })
    const include = url.searchParams.get('include')
    if (include && include !== 'metadata') return fail(400, 'BAD_REQUEST', 'Invalid request.')
    requests.push(url.pathname)
    if (mode === 'playback-error') return fail(500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred')
    if (mode === 'race' && track.trackId === tracks[0].trackId) await new Promise(resolve => setTimeout(resolve, 1800))
    return json({ data: { trackId: track.trackId,
      audioUrl: 'http://localhost:8081/audio/' + track.trackId + '.wav?signature=' + requests.length,
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
      ...(include === 'metadata' ? { metadata: track } : {}),
    } })
  }
  if (url.pathname.startsWith('/covers/')) {
    response.setHeader('Content-Type', 'image/svg+xml')
    const color = url.pathname.endsWith('1.svg') ? '#cf6a35' : '#3366aa'
    response.end(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="${color}"/><circle cx="256" cy="256" r="150" fill="#171717"/><circle cx="256" cy="256" r="40" fill="${color}"/></svg>`)
    return
  }
  if (url.pathname.startsWith('/audio/')) {
    audioRequests.push({ path: url.pathname, range: request.headers.range || null })
    if (mode === 'audio-error') { response.writeHead(404); response.end(); return }
    response.setHeader('Content-Type', 'audio/wav')
    response.setHeader('Accept-Ranges', 'bytes')
    const range = request.headers.range?.match(/bytes=(\d+)-(\d*)/)
    if (range) {
      const start = Number(range[1])
      const end = range[2] ? Math.min(Number(range[2]), wave.length - 1) : wave.length - 1
      if (start > end) { response.writeHead(416, { 'Content-Range': `bytes */${wave.length}` }); response.end(); return }
      response.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${wave.length}`, 'Content-Length': end - start + 1 })
      response.end(wave.subarray(start, end + 1))
    } else {
      response.setHeader('Content-Length', wave.length)
      response.end(wave)
    }
    return
  }
  response.writeHead(404); response.end()
}).listen(8081, '127.0.0.1', () => console.log('Browser fixture: http://127.0.0.1:8081'))
