// Local browser-test fixture only. Never used by the application by default.
import http from 'node:http'

const tracks = Array.from({ length: 9 }, (_, index) => ({
  bucketName: index < 6 ? 'music-bucket' : 'weekend-collection',
  trackId: `${['550e8400', '7ab2c391', 'a83d1940', 'c982a01e', 'bd43d971', '42b7f310', 'e743bd82', '127cb894', '32c974bb'][index]}-e29b-41d4-a716-44665544000${index}`,
}))
let mode = 'normal'
let requests = []
const wave = Buffer.alloc(44 + 8000 * 2 * 90)
wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8)
wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22)
wave.writeUInt32LE(8000, 24); wave.writeUInt32LE(16000, 28)
wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34)
wave.write('data', 36); wave.writeUInt32LE(wave.length - 44, 40)

http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost:8081')
  response.setHeader('Access-Control-Allow-Origin', '*')
  if (url.pathname === '/__test/state') {
    if (request.method === 'POST') {
      const chunks = []
      for await (const chunk of request) chunks.push(chunk)
      mode = JSON.parse(Buffer.concat(chunks).toString()).mode
      requests = []
    }
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ mode, requests }))
    return
  }
  if (url.pathname === '/api-test/all') {
    response.setHeader('Content-Type', 'application/json')
    if (mode === 'list-error') { response.writeHead(500); response.end('{}'); return }
    response.end(JSON.stringify(mode === 'empty' ? [] : mode === 'malformed' ? [null] : tracks))
    return
  }
  if (url.pathname.startsWith('/api-test/')) {
    requests.push(url.pathname)
    if (mode === 'playback-error') { response.writeHead(500); response.end('Track not found'); return }
    if (mode === 'race' && url.pathname.endsWith(tracks[0].trackId)) {
      await new Promise((resolve) => setTimeout(resolve, 1800))
    }
    response.setHeader('Content-Type', 'text/plain')
    response.end(`http://localhost:8081/audio/${url.pathname.split('/').at(-1)}.wav?signature=${requests.length}`)
    return
  }
  if (url.pathname.startsWith('/audio/')) {
    if (mode === 'audio-error') { response.writeHead(404); response.end(); return }
    response.setHeader('Content-Type', 'audio/wav')
    response.setHeader('Accept-Ranges', 'bytes')
    const range = request.headers.range?.match(/bytes=(\d+)-(\d*)/)
    if (range) {
      const start = Number(range[1])
      const end = range[2] ? Math.min(Number(range[2]), wave.length - 1) : wave.length - 1
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
