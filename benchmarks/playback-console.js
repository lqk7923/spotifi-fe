// Paste into the website's DevTools Console. MODE labels the test; it does not
// change the application's VITE_AUDIO_PRELOAD_ENABLED setting.
(() => {
  const MODE = 'on' // Change to 'off' when testing the build without preload.
  const KEY = 'spotifi.audio-latency.v1'
  const audio = document.querySelector('audio')
  if (!audio) throw new Error('Open the music player before running this snippet.')
  window.audioLatency?.stop()

  let rows = []
  try { rows = JSON.parse(localStorage.getItem(KEY) || '[]') } catch { /* Start fresh. */ }
  if (!Array.isArray(rows)) rows = []
  let pending = null
  let timer

  function finish(status) {
    if (!pending) return
    const row = {
      mode: pending.mode,
      latency_ms: status === 'ok'
        ? Number((performance.now() - pending.start).toFixed(1)) : null,
      preload_hit: status === 'ok' && audio.currentSrc.includes('/__audio_preload__/'),
      status,
    }
    pending = null
    clearTimeout(timer)
    rows.push(row)
    try { localStorage.setItem(KEY, JSON.stringify(rows)) } catch { /* Keep in memory. */ }
    console.table([row])
    if (row.mode === 'off' && row.preload_hit) {
      console.warn('This build still used preload. MODE only labels results.')
    }
  }

  function clicked(event) {
    const button = event.target.closest?.('button[aria-label="Next track"]')
    if (!button || button.disabled) return
    finish('interrupted')
    pending = {
      mode: MODE, start: performance.now(), previousSrc: audio.currentSrc,
      foreground: document.visibilityState === 'visible',
    }
    timer = setTimeout(() => finish('timeout'), 30_000)
  }

  function playing() {
    if (!pending || audio.paused || audio.readyState < 3) return
    // Ignore a queued playing event from the track that was already playing.
    if (audio.currentSrc === pending.previousSrc) return
    finish(pending.foreground && document.visibilityState === 'visible'
      ? 'ok' : 'background')
  }

  function summary() {
    console.table(['on', 'off'].map((mode) => {
      const all = rows.filter((row) => row.mode === mode)
      const good = all.filter((row) => row.status === 'ok')
      const values = good.map((row) => row.latency_ms).sort((a, b) => a - b)
      const n = values.length
      return {
        mode, samples: n, unsuccessful: all.length - n,
        avg_ms: n ? Number((values.reduce((a, b) => a + b, 0) / n).toFixed(1)) : null,
        median_ms: n ? (values[Math.floor((n - 1) / 2)] + values[Math.floor(n / 2)]) / 2 : null,
        p95_ms: n ? values[Math.ceil(n * 0.95) - 1] : null,
        preload_hits: good.filter((row) => row.preload_hit).length,
      }
    }))
  }

  document.addEventListener('click', clicked, true)
  audio.addEventListener('playing', playing)
  window.audioLatency = {
    rows,
    summary,
    reset() {
      rows.length = 0
      try { localStorage.removeItem(KEY) } catch { /* Keep in memory. */ }
    },
    stop() {
      finish('interrupted')
      document.removeEventListener('click', clicked, true)
      audio.removeEventListener('playing', playing)
      clearTimeout(timer)
    },
  }
  console.log(`Measuring Next → playing; MODE=${MODE}. Play a track, then click Next.`)
  console.log('Summary: audioLatency.summary(); clear results: audioLatency.reset()')
})()
