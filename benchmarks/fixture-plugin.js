import { randomUUID } from 'node:crypto'

export const NETWORK_PROFILES = {
  local: { apiDelayMs: 0, audioDelayMs: 0, bytesPerSecond: 0 },
  moderate: { apiDelayMs: 80, audioDelayMs: 120, bytesPerSecond: 1_000_000 },
  slow: { apiDelayMs: 200, audioDelayMs: 200, bytesPerSecond: 256_000 },
}

const tracks = Array.from({ length: 5 }, (_, index) => ({
  bucketName: 'benchmark-fixture', trackId: `sample-${index + 1}`,
  trackTitle: `Silent WAV ${index + 1}`, trackDuration: 180000, author: 'Benchmark fixture',
}))

function createWave() {
  const wave = Buffer.alloc(44 + 44100 * 2 * 180)
  wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8)
  wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22)
  wave.writeUInt32LE(44100, 24); wave.writeUInt32LE(88200, 28)
  wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34)
  wave.write('data', 36); wave.writeUInt32LE(wave.length - 44, 40)
  return wave
}

// Dev-server middleware only. No listener, separate port, or production endpoint.
export default function benchmarkFixture() {
  const runs = new Map()
  let wave
  return {
    name: 'preload-benchmark-fixture',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url, 'http://localhost')
        if (!url.pathname.startsWith('/__benchmark_api/')) return next()
        response.setHeader('Cache-Control', 'no-store')
        const json = (value, status = 200) => {
          response.writeHead(status, { 'Content-Type': 'application/json' })
          response.end(JSON.stringify(value))
        }
        if (url.pathname === '/__benchmark_api/tracks') return json(tracks)
        if (url.pathname === '/__benchmark_api/profiles') return json(NETWORK_PROFILES)
        const runId = url.searchParams.get('run')
        if (url.pathname === '/__benchmark_api/traffic') return json(runs.get(runId) || [])
        const profile = NETWORK_PROFILES[url.searchParams.get('profile')]
        if (!profile || !runId) return json({ error: 'Missing benchmark profile/run' }, 400)
        if (url.pathname.startsWith('/__benchmark_api/track/')) {
          await new Promise((resolve) => setTimeout(resolve, profile.apiDelayMs))
          if (response.destroyed) return
          const audio = new URL('/__benchmark_api/audio.wav', url)
          audio.search = url.search
          audio.searchParams.set('signature', randomUUID())
          audio.searchParams.set('expires', String(Date.now() + 120_000))
          return json({ trackPresignedLink: `http://${request.headers.host}${audio.pathname}${audio.search}` })
        }
        if (url.pathname !== '/__benchmark_api/audio.wav') return json({ error: 'Not found' }, 404)
        if (Number(url.searchParams.get('expires')) < Date.now()) return json({ error: 'Expired signature' }, 403)
        wave ||= createWave()
        const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/)
        const start = range ? Number(range[1]) : 0
        const end = range?.[2] ? Math.min(Number(range[2]), wave.length - 1) : wave.length - 1
        if (start > end || start >= wave.length) {
          response.writeHead(416, { 'Content-Range': `bytes */${wave.length}` })
          response.end()
          return
        }
        if (!runs.has(runId)) {
          if (runs.size >= 20) runs.delete(runs.keys().next().value)
          runs.set(runId, [])
        }
        const record = {
          mode: url.searchParams.get('mode'), warmup: url.searchParams.get('warmup') === 'true',
          round: Number(url.searchParams.get('round')), range: request.headers.range || null, sentBytes: 0,
        }
        runs.get(runId).push(record)
        await new Promise((resolve) => setTimeout(resolve, profile.audioDelayMs))
        if (response.destroyed) return
        const headers = { 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 }
        if (range) headers['Content-Range'] = `bytes ${start}-${end}/${wave.length}`
        response.writeHead(range ? 206 : 200, headers)
        if (!profile.bytesPerSecond) {
          record.sentBytes = end - start + 1
          response.end(wave.subarray(start, end + 1))
          return
        }
        const chunkSize = 16_000
        let offset = start
        let timer
        const writeChunk = () => {
          if (response.destroyed) return
          const stop = Math.min(offset + chunkSize, end + 1)
          const chunk = wave.subarray(offset, stop)
          offset = stop
          record.sentBytes += chunk.length
          const writable = response.write(chunk)
          if (offset > end) return response.end()
          const schedule = () => { timer = setTimeout(writeChunk, chunkSize / profile.bytesPerSecond * 1000) }
          if (writable) schedule()
          else response.once('drain', schedule)
        }
        response.on('close', () => clearTimeout(timer))
        writeChunk()
      })
    },
  }
}
