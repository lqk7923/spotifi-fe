// Local browser-test fixture only. Never used by the application by default.
import http from 'node:http'

const tracks = Array.from({ length: 9 }, (_, index) => ({
  bucketName: index < 6 ? 'music-bucket' : 'weekend-collection',
  trackId: `${['550e8400', '7ab2c391', 'a83d1940', 'c982a01e', 'bd43d971', '42b7f310', 'e743bd82', '127cb894', '32c974bb'][index]}-e29b-41d4-a716-44665544000${index}`,
  trackTitle: index === 0 ? 'Industrial Drum' : `Sample Track ${index + 1}`,
  trackDuration: 180000,
  author: index === 0 ? 'looplicator' : `Sample Artist ${index + 1}`,
  albumId: `00000000-0000-0000-0000-00000000000${index < 6 ? 1 : 2}`,
  albumTitle: index < 6 ? 'Sample Album' : 'Weekend Album',
}))
let mode = 'normal'
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
  if (url.pathname === '/track/all') {
    response.setHeader('Content-Type', 'application/json')
    if (mode === 'list-error') { response.writeHead(500); response.end('{}'); return }
    response.end(JSON.stringify(mode === 'empty' ? [] : mode === 'malformed' ? [null] : tracks))
    return
  }
  if (url.pathname.startsWith('/album/')) {
    response.setHeader('Content-Type', 'application/json')
    if (mode === 'album-not-found') { response.writeHead(404); response.end('{}'); return }
    if (mode === 'album-error') { response.writeHead(500); response.end('{}'); return }
    const albumId = url.pathname.split('/')[2]
    let albumTracks = tracks.filter((track) => track.albumId === albumId)
    if (mode === 'album-switch') {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      if (albumId.endsWith('2')) albumTracks = albumTracks.slice(0, 1)
    }
    response.end(JSON.stringify(mode === 'empty' ? [] : albumTracks))
    return
  }
  if (url.pathname.startsWith('/track/')) {
    requests.push(url.pathname)
    if (mode === 'playback-error') { response.writeHead(500); response.end('Track not found'); return }
    if (mode === 'race' && url.pathname.endsWith(tracks[0].trackId)) {
      await new Promise((resolve) => setTimeout(resolve, 1800))
    }
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({
      trackPresignedLink: `http://localhost:8081/audio/${url.pathname.split('/').at(-1)}.wav?signature=${requests.length}`,
    }))
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
