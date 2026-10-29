import assert from 'node:assert/strict'
import { beforeEach, afterEach, test, mock } from 'node:test'
import { auth } from '../src/services/keycloak.js'
import { getAlbum, getAlbumTracks, getTrack, getPlaybackUrl, getSigningEndpoint, getTrackLinks, getTracks } from '../src/services/music-api.js'
import { getAlbumQueue, trackAuthor, trackDurationSeconds, trackLabel } from '../src/lib/tracks.js'

afterEach(() => mock.restoreAll())
beforeEach(context => context.mock.method(auth, 'getAccessToken', async () => 'test-access-token'))
const track = {
  trackId: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Industrial Drum', durationMs: 12000, artist: 'looplicator',
  albumId: '00000000-0000-0000-0000-000000000001', albumTitle: 'Industrial Drum',
  coverUrl: 'https://r2.example/cover.jpg?X-Amz-Signature=abc', coverExpiresAt: '2099-10-29T12:00:00Z',
}
const album = { albumId: track.albumId, title: track.albumTitle, artist: 'Album artist',
  coverUrl: track.coverUrl, coverExpiresAt: track.coverExpiresAt, releaseDate: '2026-10-05' }
const page = (data, page = 0, totalElements = data.length) => ({ data,
  pagination: { page, size: 20, totalElements, totalPages: Math.ceil(totalElements / 20) } })

test('loads every catalog page in server order and removes duplicate identities', async () => {
  const first = Array.from({ length: 20 }, (_, i) => ({ ...track, trackId: String(i) }))
  const last = [first[0], { ...track, trackId: 'last' }]
  const paths = []
  mock.method(globalThis, 'fetch', async url => {
    paths.push(url)
    return Response.json(paths.length === 1 ? page(first, 0, 22) : page(last, 1, 22))
  })
  assert.deepEqual(await getTracks(), [...first, last[1]])
  assert.deepEqual(paths, ['/tracks?page=0&size=20', '/tracks?page=1&size=20'])
})

test('supports an empty database and rejects malformed pagination', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json(page([])))
  assert.deepEqual(await getTracks(), [])
  for (const body of [[], null, { data: [] }, page([], 1), { ...page([]), pagination: { ...page([]).pagination, size: 21 } },
    { ...page([]), pagination: { ...page([]).pagination, totalPages: 1 } }, page([track], 0, 21)]) {
    mock.method(globalThis, 'fetch', async () => Response.json(body))
    await assert.rejects(getTracks(), /pagination/)
  }
})

test('loads protected album metadata and its unpaginated track list separately', async () => {
  const paths = []
  mock.method(globalThis, 'fetch', async (url, options) => {
    paths.push(url)
    assert.equal(options.headers.Authorization, 'Bearer test-access-token')
    return Response.json({ data: url.endsWith('/tracks') ? [track] : album })
  })
  assert.deepEqual(await getAlbum(track.albumId), album)
  assert.deepEqual(await getAlbumTracks(track.albumId), [track])
  assert.deepEqual(paths, ['/albums/' + track.albumId, '/albums/' + track.albumId + '/tracks'])
})

test('an existing empty album returns an empty queue; missing albums preserve 404', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({ data: [] }))
  assert.deepEqual(getAlbumQueue(await getAlbumTracks(track.albumId)), [])
  mock.method(globalThis, 'fetch', async () => Response.json({ code: 'RESOURCE_NOT_FOUND', message: 'Album not found' }, { status: 404 }))
  for (const request of [getAlbum, getAlbumTracks]) {
    await assert.rejects(request(track.albumId), error => error.status === 404 && error.code === 'RESOURCE_NOT_FOUND')
  }
})

test('album queues preserve track artists, metadata, order and deduplicate IDs', () => {
  const other = { ...track, trackId: 'second', artist: 'Guest artist' }
  assert.deepEqual(getAlbumQueue([other, track, track]), [other, track])
  assert.equal(track.artist, 'looplicator')
})

test('rejects malformed resource envelopes and track fields before rendering', async () => {
  for (const body of [null, [], album, { data: {} }, { data: { ...album, title: undefined } }, { data: { ...album, artist: {} } }]) {
    mock.method(globalThis, 'fetch', async () => Response.json(body))
    await assert.rejects(getAlbum(track.albumId), /unexpected album/)
  }
  for (const entry of [null, {}, { ...track, title: {} }, { ...track, artist: undefined },
    { ...track, durationMs: '12000' }, { ...track, durationMs: -1 }, { ...track, albumId: '' }, { ...track, albumTitle: undefined }]) {
    mock.method(globalThis, 'fetch', async url => Response.json(url.includes('?') ? page([entry]) : { data: [entry] }))
    await assert.rejects(getTracks(), /unexpected track list/)
    await assert.rejects(getAlbumTracks(track.albumId), /unexpected track list/)
  }
})

test('escapes resource IDs, preserves validation errors and forwards cancellation', async () => {
  const paths = []
  mock.method(globalThis, 'fetch', async url => {
    paths.push(url)
    return Response.json({ code: 'BAD_REQUEST', message: 'Invalid request.' }, { status: 400 })
  })
  for (const request of [getAlbum, getAlbumTracks, getTrack]) {
    await assert.rejects(request('id/?#'), error => error.status === 400 && error.message === 'Invalid request.')
  }
  assert.deepEqual(paths, ['/albums/id%2F%3F%23', '/albums/id%2F%3F%23/tracks', '/tracks/id%2F%3F%23'])
  const controller = new AbortController()
  mock.method(globalThis, 'fetch', async (_url, { signal }) => { controller.abort(); signal.throwIfAborted() })
  await assert.rejects(getAlbumTracks('id', controller.signal), { name: 'AbortError' })
})

test('track detail reads metadata from data rather than treating it as audio signing', async () => {
  mock.method(globalThis, 'fetch', async url => {
    assert.equal(url, '/tracks/' + track.trackId)
    return Response.json({ data: track })
  })
  assert.deepEqual(await getTrack(track.trackId), track)
})

test('reads signed URLs from JSON and escapes the track ID without a bucket', async () => {
  mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/track/track%2Fid')
    assert.equal(options.cache, 'no-store')
    return Response.json({ trackPresignedLink: ' https://r2.example/audio?X-Amz-Signature=abc\n' })
  })
  assert.equal(await getPlaybackUrl({ trackId: 'track/id' }),
    'https://r2.example/audio?X-Amz-Signature=abc')
})

test('does not depend on the backend error body contract', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('<html>internal error</html>', { status: 500 }))
  await assert.rejects(getTracks(), /error \(500\)/)
  await assert.rejects(getAlbumTracks(track.albumId), /error \(500\)/)
  await assert.rejects(getPlaybackUrl(track), /error \(500\)/)
})

test('rejects missing or unsafe audio URLs', async () => {
  for (const body of [null, {}, { trackPresignedLink: 123 },
    ...['', 'not a URL', 'javascript:alert(1)', 'data:audio/wav;base64,abc'].map((trackPresignedLink) => ({ trackPresignedLink }))]) {
    mock.method(globalThis, 'fetch', async () => Response.json(body))
    await assert.rejects(getPlaybackUrl(track), /valid audio URL/)
    mock.restoreAll()
  }
})

test('rejects the old plain-text playback response', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('https://r2.example/audio'))
  await assert.rejects(getPlaybackUrl(track), /valid audio URL/)
})

test('uses track metadata and converts milliseconds into player seconds', () => {
  assert.equal(trackLabel(track), 'Industrial Drum')
  assert.equal(trackAuthor(track), 'looplicator')
  assert.equal(trackDurationSeconds(track), 12)
  assert.equal(trackDurationSeconds({ durationMs: 90500 }), 90.5)
  assert.equal(trackDurationSeconds({ durationMs: 0 }), 0)
  assert.equal(trackDurationSeconds({}), null)
  assert.equal(trackLabel({ ...track, title: ' ' }), 'Track 550e8400')
  assert.equal(trackAuthor({ ...track, artist: null }), 'Unknown artist')
  assert.equal(getSigningEndpoint({ trackId: 'track/id' }), '/track/track%2Fid')
})

test('track detail exposes both signed audio and cover links', async () => {
  const links = { trackPresignedLink: 'https://r2.example/audio', coverPresignedLink: track.coverUrl }
  mock.method(globalThis, 'fetch', async () => Response.json(links))
  assert.deepEqual(await getTrackLinks(track), links)
})

test('forwards request cancellation when a track is superseded', async () => {
  const controller = new AbortController()
  mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    controller.abort()
    assert.equal(signal.aborted, true)
    throw signal.reason
  })
  await assert.rejects(getPlaybackUrl(track, controller.signal), { name: 'AbortError' })
})
