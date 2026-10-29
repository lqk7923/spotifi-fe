import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCatalogClient, createApiClient } from '../src/services/api-client.js'
import { createGuestPlayer } from '../src/features/player/lib/guest-player.js'

const guestSession = status => ({
  getSnapshot: () => ({ status, user: null }),
  initialize: () => assert.fail('Public browsing must not wait for SSO'),
  getAccessToken: () => assert.fail('Guests must not request or refresh tokens'),
})

test('catalog metadata loads without credentials while SSO is pending, signed out, or unavailable', async () => {
  for (const status of ['loading', 'signed-out', 'error']) {
    const paths = []
    const request = createCatalogClient({ session: guestSession(status), fetcher: async (url, options) => {
      paths.push(url)
      assert.equal(options.credentials, 'omit')
      assert.equal(options.headers?.Authorization, undefined)
      assert.equal(options.cache, 'no-store')
      return Response.json([])
    } })
    await request('/tracks?page=0&size=20')
    assert.deepEqual(paths, ['/tracks?page=0&size=20'])
  }
})

test('public catalog rejects signing routes and external media before issuing any request', async () => {
  const request = createCatalogClient({ session: guestSession('signed-out'), fetcher: () => assert.fail('No media requests') })
  for (const path of ['/tracks/id', '/tracks/id/playback', '/albums/id', '/albums/id/tracks', '/tracks?include=metadata', 'https://r2.example/audio', '//r2.example/audio', '/albums/id/tracks?audio=true']) {
    await assert.rejects(request(path), /metadata path/)
  }
})

test('a protected catalog returns a useful BE configuration error without refresh, redirect, or retry', async () => {
  for (const status of [401, 403]) {
    let requests = 0
    const request = createCatalogClient({ session: guestSession('signed-out'), fetcher: async () => {
      requests++
      return new Response(null, { status })
    } })
    await assert.rejects(request('/tracks?page=0&size=20'), error => error.status === status && /public catalog access/.test(error.message))
    assert.equal(requests, 1)
  }
})

test('authenticated catalog requests keep token refresh and one retry after a 401', async () => {
  const refreshes = []
  const tokens = []
  const request = createCatalogClient({ session: {
    getSnapshot: () => ({ status: 'authenticated' }),
    getAccessToken: async force => { refreshes.push(force); return force ? 'fresh-token' : 'initial-token' },
  }, fetcher: async (_, options) => {
    tokens.push(options.headers.Authorization)
    return new Response(null, { status: tokens.length === 1 ? 401 : 200 })
  } })
  await request('/tracks?page=0&size=20')
  assert.deepEqual(refreshes, [false, true])
  assert.deepEqual(tokens, ['Bearer initial-token', 'Bearer fresh-token'])
})

test('an expired authenticated session cannot silently downgrade its request to anonymous', async () => {
  const request = createCatalogClient({ session: {
    getSnapshot: () => ({ status: 'authenticated' }),
    getAccessToken: async () => { throw new Error('Session expired') },
  }, fetcher: () => assert.fail('Expired sessions must stop protected requests') })
  await assert.rejects(request('/tracks?page=0&size=20'), /Session expired/)
})

test('canceled catalog requests do not fetch', async () => {
  const controller = new AbortController()
  controller.abort()
  const request = createCatalogClient({ session: guestSession('signed-out'), fetcher: () => assert.fail('No request after cancellation') })
  await assert.rejects(request('/tracks?page=0&size=20', controller.signal), { name: 'AbortError' })
})

test('audio signing still rejects guests before calling the backend', async () => {
  const request = createApiClient({ session: { getAccessToken: async () => { throw new Error('Please log in') } },
    fetcher: () => assert.fail('Guests must not sign audio') })
  await assert.rejects(request('/tracks/id/playback'), /log in/)
})

test('all guest play controls request login with the selected cover and never select a playing track', () => {
  const first = { trackId: 'first', coverUrl: 'https://r2.example/first.jpg' }
  const selected = { trackId: 'selected', coverUrl: 'https://r2.example/selected.jpg' }
  const prompts = []
  const player = createGuestPlayer([first, selected], track => prompts.push(track))
  player.startTrack(selected)
  player.selectTrack(selected)
  player.togglePlayback()
  player.setShuffle(true)
  player.setRepeat(true)
  player.skip(1)
  assert.deepEqual(prompts, [selected, selected, first, first, first, first])
  assert.deepEqual(player.tracks, [first, selected])
  assert.equal(player.currentTrack, null)
  assert.equal(player.isPlaying, false)
  assert.equal(player.isLoading, false)
  assert.equal(player.error, '')
})
