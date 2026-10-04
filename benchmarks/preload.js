import { AudioPreloader, PRELOAD_BYTES } from '../src/features/player/lib/audio-preload.js'
import { getTracks } from '../src/services/music-api.js'
import { trackKey, trackLabel } from '../src/lib/tracks.js'
import { summarize } from './statistics.js'

const modes = ['native', 'ready', 'early']
const labels = { native: 'Không preload', ready: 'Preload ready', early: 'Early selection' }
const element = (id) => document.getElementById(id)
const samples = []
const signatures = new Set()
let report
let runController

async function fixtureJson(path, signal) {
  const response = await fetch(path, { cache: 'no-store', signal })
  if (!response.ok) throw new Error(`Fixture HTTP ${response.status}`)
  return response.json()
}

function fixtureApi(track, settings, mode, warmup, round, signal) {
  const query = new URLSearchParams({
    run: report.runId, profile: settings.profile, mode, warmup: String(warmup), round: String(round),
  })
  const signingEndpointFor = () => `/__benchmark_api/track/${encodeURIComponent(track.trackId)}?${query}`
  return {
    signingEndpointFor,
    requestPlaybackUrl: async (_track, requestSignal) => {
      const data = await fixtureJson(signingEndpointFor(), requestSignal || signal)
      return data.trackPresignedLink
    },
  }
}

function delay(milliseconds, signal) {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const finish = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
    }
    const abort = () => { finish(); reject(signal.reason) }
    const timer = setTimeout(() => { finish(); resolve() }, milliseconds)
    signal.addEventListener('abort', abort, { once: true })
  })
}

function waitForPlaying(audio, signal) {
  let cleanup
  const promise = new Promise((resolve, reject) => {
    const playing = () => { cleanup(); resolve(performance.now()) }
    const failed = () => { cleanup(); reject(new Error(`Audio error ${audio.error?.code || 'unknown'}`)) }
    const aborted = () => { cleanup(); reject(signal.reason) }
    cleanup = () => {
      audio.removeEventListener('playing', playing)
      audio.removeEventListener('error', failed)
      signal.removeEventListener('abort', aborted)
    }
    audio.addEventListener('playing', playing, { once: true })
    audio.addEventListener('error', failed, { once: true })
    signal.addEventListener('abort', aborted, { once: true })
  })
  // Playback errors can arrive before play() settles; attach a handler immediately.
  promise.catch(() => {})
  return { promise, cleanup: () => cleanup() }
}

async function measure(track, mode, settings, warmup, round, parentSignal) {
  const audio = new Audio()
  audio.muted = true
  audio.preload = 'metadata'
  const controller = new AbortController()
  const signal = AbortSignal.any([parentSignal, controller.signal, AbortSignal.timeout(35_000)])
  const api = settings.source === 'fixture' ? fixtureApi(track, settings, mode, warmup, round, signal) : undefined
  const preloader = new AudioPreloader(api)
  const sample = {
    mode, round, warmup, track: trackKey(track), title: trackLabel(track), status: 'error',
    preparationMs: 0, completedPrefixBytes: 0, cached: false,
    waitingEvents: 0, waitingMs: 0, duplicateSignature: false,
  }
  let playback
  let entry
  let startedPlaying = false
  let waitingAt = null
  const onWaiting = () => {
    if (startedPlaying && waitingAt == null) {
      sample.waitingEvents++
      waitingAt = performance.now()
    }
  }
  const onPlaying = () => {
    if (waitingAt != null) sample.waitingMs += performance.now() - waitingAt
    waitingAt = null
  }
  audio.addEventListener('waiting', onWaiting)
  audio.addEventListener('playing', onPlaying)
  try {
    if (mode !== 'native') {
      const preparationStart = performance.now()
      preloader.preload(track)
      entry = preloader.next
      if (mode === 'ready') {
        await Promise.race([
          entry.ready,
          new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })),
        ])
        signal.throwIfAborted()
        if (!entry.data) throw new Error('Preload unavailable (Service Worker, Range, or CORS). Ready trial invalid.')
      } else {
        await delay(settings.leadMs, signal)
      }
      sample.preparationMs = performance.now() - preparationStart
    }
    sample.visibilityAtStart = document.visibilityState
    const start = performance.now()
    const source = await preloader.source(track, signal)
    sample.sourceMs = performance.now() - start
    sample.cached = source.cached
    const signedUrl = source.cached ? entry.url : source.url
    sample.duplicateSignature = signatures.has(signedUrl)
    signatures.add(signedUrl)
    // Do not export signed URLs: they are short-lived playback credentials.
    if (entry?.data) sample.completedPrefixBytes = Math.min(PRELOAD_BYTES, entry.data.total)
    playback = waitForPlaying(audio, signal)
    audio.src = source.url
    audio.load()
    await Promise.all([audio.play(), playback.promise])
    const playingAt = await playback.promise
    sample.startupMs = playingAt - start
    startedPlaying = true
    await delay(settings.observeMs, signal)
    if (audio.error) throw new Error(`Audio error ${audio.error.code} after startup`)
    if (waitingAt != null) sample.waitingMs += performance.now() - waitingAt
    sample.status = 'ok'
  } catch (cause) {
    sample.status = parentSignal.aborted ? 'cancelled' : 'error'
    sample.error = cause.message || String(cause)
  } finally {
    playback?.cleanup()
    controller.abort()
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    preloader.dispose()
  }
  samples.push(sample)
}

function updateReport() {
  report.samples = samples
  report.summary = modes.map((mode) => summarize(samples, mode))
  const tbody = element('summary')
  tbody.replaceChildren()
  const number = (value) => value == null ? '—' : value.toFixed(1)
  for (const group of report.summary) {
    const row = document.createElement('tr')
    const values = [labels[group.mode], `${group.successes}/${group.total}`,
      number(group.startupP50Ms), number(group.startupP95Ms), number(group.sourceP50Ms),
      number(group.preparationP50Ms), `${group.cacheHits}/${group.successes}`, group.waitingEvents]
    for (const value of values) {
      const cell = document.createElement('td')
      cell.textContent = value
      row.append(cell)
    }
    tbody.append(row)
  }
  const [baseline, cached] = report.summary
  if (baseline.startupP50Ms > 0 && cached.startupP50Ms != null) {
    const saved = baseline.startupP50Ms - cached.startupP50Ms
    element('comparison').textContent = `Ready p50 giảm ${saved.toFixed(1)} ms (${(saved / baseline.startupP50Ms * 100).toFixed(1)}%) so với native trong lần chạy này. Không tính thời gian chuẩn bị cache vào độ trễ chọn → phát.`
  }
  element('report').textContent = JSON.stringify(report, null, 2)
}

element('settings').addEventListener('submit', async (event) => {
  event.preventDefault()
  runController = new AbortController()
  const signal = runController.signal
  const settings = {
    runs: Number(element('runs').value), leadMs: Number(element('lead').value),
    observeMs: Number(element('observe').value), environment: element('environment').value,
    source: element('source').value, profile: element('profile').value,
  }
  samples.length = 0
  signatures.clear()
  element('comparison').textContent = ''
  element('run').disabled = true
  element('stop').disabled = false
  element('download').disabled = true
  report = {
    runId: crypto.randomUUID(),
    startedAt: new Date().toISOString(), settings,
    userAgent: navigator.userAgent, origin: location.origin,
    timing: 'performance.now at source selection → first HTMLMediaElement playing event; muted audio',
    ordering: 'Paired by track/round; scenario order rotates each round; one excluded warm-up per scenario',
    signatureSpacingMs: 1100,
    caveats: [
      'Warm ready latency excludes preload preparation; preparation and complete-prefix bytes are reported separately.',
      'HTTP cache/DNS/TLS/CDN state is uncontrolled unless explicitly configured outside this harness.',
      'DevTools throttling can affect page and Service Worker fetches differently; record configuration.',
      'Completed prefix bytes exclude partial/aborted transfers and native audio requests.',
      'Short observation window does not measure stalls across the entire song or physical speaker latency.',
      'Small sample p95 is exploratory; this is a dev-server run, not production or a population estimate.',
      'This isolates AudioPreloader and HTMLAudioElement; it excludes React rendering and UI event dispatch.',
    ],
  }
  try {
    const tracks = settings.source === 'fixture'
      ? await fixtureJson('/__benchmark_api/tracks', signal)
      : await getTracks(signal)
    if (settings.source === 'fixture') {
      const profiles = await fixtureJson('/__benchmark_api/profiles', signal)
      report.fixtureProfile = profiles[settings.profile]
      report.caveats.push('Fixture uses silent 180-second PCM WAV files; simulated results do not estimate production R2 or MP3 performance.')
    }
    if (!tracks.length) throw new Error('Không có bài hát để đo.')
    report.tracks = tracks.map((track) => ({ key: trackKey(track), title: trackLabel(track) }))
    for (let round = -1; round < settings.runs; round++) {
      const track = tracks[Math.max(0, round) % tracks.length]
      const order = modes.map((_, index) => modes[(index + Math.max(0, round)) % modes.length])
      for (const mode of order) {
        signal.throwIfAborted()
        element('status').textContent = `${round < 0 ? 'Warm-up' : `Lượt ${round + 1}/${settings.runs}`} — ${labels[mode]} — ${trackLabel(track)}`
        // AWS-style signatures typically have second-resolution timestamps.
        // Space trials to reduce identical signed URLs; duplicates are still flagged.
        await delay(1100, signal)
        await measure(track, mode, settings, round < 0, round, signal)
        updateReport()
      }
    }
    report.outcome = 'complete'
    element('status').textContent = 'Hoàn tất benchmark.'
  } catch (cause) {
    report.outcome = signal.aborted ? 'cancelled' : 'error'
    element('status').textContent = signal.aborted ? 'Đã dừng.' : `Không chạy được: ${cause.message}`
  } finally {
    if (settings.source === 'fixture') {
      try {
        report.fixtureTraffic = await fixtureJson(`/__benchmark_api/traffic?run=${report.runId}`)
      } catch {
        report.caveats.push('Fixture traffic counters unavailable.')
      }
    }
    report.finishedAt = new Date().toISOString()
    updateReport()
    element('run').disabled = false
    element('stop').disabled = true
    element('download').disabled = false
  }
})

element('stop').addEventListener('click', () => runController?.abort())
element('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'preload-benchmark.json'
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})
