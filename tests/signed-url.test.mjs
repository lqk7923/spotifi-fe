import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isSignedUrlFresh, playbackSource } from '../src/lib/signed-url.js'
import { AudioPreloader } from '../src/features/player/lib/audio-preload.js'

test('URL freshness follows the server expiration for short and long lifetimes', () => {
  for (const lifetime of [1000, 120_000, 600_000, 7 * 86400_000]) {
    const signature = { signedAt: 0, expiresAt: lifetime }
    const margin = Math.min(10_000, lifetime / 10)
    assert.equal(isSignedUrlFresh(signature, lifetime - margin - 1), true)
    assert.equal(isSignedUrlFresh(signature, lifetime - margin), false)
    assert.equal(isSignedUrlFresh(signature, lifetime + 1), false)
  }
})

test('native playback retains the explicit expiration returned by the backend', async () => {
  const expiresAt = new Date(Date.now() + 1000).toISOString()
  const preloader = new AudioPreloader({ enabled: false,
    requestPlaybackUrl: async () => ({ audioUrl: 'https://r2.example/audio', expiresAt }) })
  const result = await preloader.source({ trackId: 'track' }, new AbortController().signal)
  assert.equal(result.url, 'https://r2.example/audio')
  assert.equal(result.expiresAt, Date.parse(expiresAt))
  assert.equal(result.cached, false)
  assert.equal(playbackSource({ audioUrl: result.url, expiresAt }).expiresAt, result.expiresAt)
})

test('fallback selection renews a short-lived URL even when it was signed recently', async () => {
  let renewals = 0
  const preloader = new AudioPreloader({ requestPlaybackUrl: async () => {
    renewals++
    return { audioUrl: 'https://r2.example/fresh', expiresAt: new Date(Date.now() + 600_000).toISOString() }
  } })
  preloader.next = { key: 'track', ready: Promise.resolve(), controller: new AbortController(),
    url: 'https://r2.example/old', signedAt: Date.now() - 2000, expiresAt: Date.now() - 1000 }
  const result = await preloader.source({ trackId: 'track' }, new AbortController().signal)
  assert.equal(result.url, 'https://r2.example/fresh')
  assert.equal(renewals, 1)
})
