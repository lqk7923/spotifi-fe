# Audio preload benchmark

Run the existing Vite dev server (`npm run dev`) and open
`http://localhost:5173/benchmarks/preload.html`. No additional server or port is
needed. This page is not an entry in the default production build. The fixture
middleware is installed only in the development server.

## What it measures

The runner uses the application's `AudioPreloader` and a muted HTML audio element.
It times source selection to the first `playing` event using `performance.now()`.
This includes signing or publishing the cached prefix, audio loading, and decoder
startup. It excludes React rendering, click dispatch, and physical output-device
latency. It does not time completion of the entire audio download.

Each track/round has three scenarios, whose order rotates each round:

- **Native:** no predicted track or cached prefix; request a fresh playback URL.
- **Ready:** complete the prefix preload before starting the selection timer.
  Report that preparation time separately. Missing preload data invalidates the
  trial rather than calling native fallback a cache hit.
- **Early selection:** begin preload, wait the configured lead time (default
  50 ms), then select. This exercises the real 150 ms join/fallback policy.

One warm-up per scenario is excluded from the summaries. The runner pauses and
unloads the audio after each observation window, releases cached prefixes, uses
fresh playback sessions, and spaces trials by 1.1 seconds to reduce reuse of
second-resolution signatures. The report flags any reused signed URL, without
exporting the URL itself.

## Reproducible procedure

1. Start the backend and select **API thật / R2**. For local simulation, select
   **Fixture mô phỏng** and a network profile. Keep these datasets separate.
2. Pause other playback, keep the benchmark tab in the foreground, and keep the
   browser/device/power conditions the same between runs.
3. In Chrome DevTools Network, enable **Disable cache**, leave Service Worker
   **Bypass for network** off, and configure any throttling. Record the settings
   in the environment field. Throttling Service Worker fetches can behave
   differently from throttling page requests, so verify the requests themselves.
4. Start with 20 trials per group as a pilot. Repeat with 50–100 trials per group
   and multiple runs/network profiles before relying on p95 or generalizing.
5. Download JSON. Keep the raw samples, browser version, settings, failures,
   visibility state, and cache-hit counts alongside the result table.

The page summarizes p50/p95 startup time, source acquisition time, preparation
time, cache hits, and `waiting` events during the configured observation window.
The percentile estimator uses nearest rank.

`latency reduction (%) = (native p50 - ready p50) / native p50 × 100`

Compare paired samples by track/round as well as aggregates. A ready result
describes a successful prediction with enough lead time; it is not the average
improvement for all clicks. Real improvement depends on prediction accuracy,
cache-hit rate, preparation time, link expiry, and network contention.

## Traffic and limitations

The preloader requests up to 2,500,000 bytes per predicted track. Completed
prefix-byte counts omit cancelled partial downloads and native media traffic;
they cannot establish overall bandwidth savings. The fixture additionally logs
bytes passed to server response writes, including aborted preload attempts.
Those are server counters, not confirmed client-received bytes. Warm-up traffic
is marked separately.

The fixture serves silent 180-second PCM WAV files. Its profiles add a signing
delay, audio response delay, and application-level chunk pacing. This is a
controlled simulation, not a TCP/network emulator or an estimate of R2/MP3
production performance. A 1-second observation window also does not measure
stalling over an entire song.

Current-network runs without DevTools cache controls are exploratory. DNS, TLS,
CDN cache state, browser media cache, server load, and scheduler variability can
affect results. Do not describe the startup improvement as faster page load,
higher network throughput, or reduced total download size.

References:

- [MDN: HTMLMediaElement playing event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playing_event)
- [Chrome DevTools: Network reference](https://developer.chrome.com/docs/devtools/network/reference/)
