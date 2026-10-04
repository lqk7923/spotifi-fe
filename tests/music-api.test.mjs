import assert from 'node:assert/strict'
import { afterEach, test, mock } from 'node:test'
import { getAlbumTracks, getPlaybackUrl, getSigningEndpoint, getTracks } from '../src/services/music-api.js'
import { getAlbumQueue, trackAuthor, trackDurationSeconds, trackLabel } from '../src/lib/tracks.js'
import { albumPath, resolveRoute } from '../src/app/routing/navigation.js'

afterEach(() => mock.restoreAll())
const track = {
  bucketName: 'music-bucket', trackId: '550e8400-e29b-41d4-a716-446655440000',
  trackTitle: 'Industrial Drum', trackDuration: 12000, author: 'looplicator',
  albumId: '00000000-0000-0000-0000-000000000001', albumTitle: 'Industrial Drum',
}
const albumTrack = {
  bucketName: track.bucketName, trackId: track.trackId,
  trackTitle: track.trackTitle, trackDuration: track.trackDuration,
}
const album = {
  albumId: track.albumId, albumTitle: track.albumTitle,
  author: track.author, albumTracks: [albumTrack],
}

test('loads the documented track list and removes duplicate identities', async () => {
  mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, '/track/all')
    return Response.json([track, track, { ...track, bucketName: 'another-bucket' }])
  })
  assert.deepEqual(await getTracks(), [track, { ...track, bucketName: 'another-bucket' }])
})

test('supports an empty database', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json([]))
  assert.deepEqual(await getTracks(), [])
})

test('loads album metadata and nested tracks from the album endpoint', async () => {
  mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, `/album/${track.albumId}/tracks`)
    return Response.json(album)
  })
  const result = await getAlbumTracks(track.albumId)
  assert.deepEqual(result, album)
  assert.deepEqual(getAlbumQueue(result), [track])
  assert.equal(result.albumTracks[0].albumId, undefined)
})

test('keeps album track order and deduplicates queue identities within buckets', async () => {
  const secondTrack = { ...albumTrack, trackId: 'second-track' }
  const otherBucket = { ...albumTrack, bucketName: 'another-bucket' }
  const responseAlbum = { ...album, albumTracks: [secondTrack, albumTrack, albumTrack, otherBucket] }
  mock.method(globalThis, 'fetch', async () => Response.json(responseAlbum))
  assert.deepEqual(getAlbumQueue(await getAlbumTracks(track.albumId)), [
    { ...track, trackId: 'second-track' }, track, { ...track, bucketName: 'another-bucket' },
  ])
})

test('uses album metadata for queue entries even if a track contains stale album fields', () => {
  const responseAlbum = {
    ...album, albumTitle: 'Updated album', author: 'Updated artist', albumTracks: [track],
  }
  assert.deepEqual(getAlbumQueue(responseAlbum), [{
    ...track, albumTitle: 'Updated album', author: 'Updated artist',
  }])
  assert.equal(responseAlbum.albumTracks[0].albumTitle, track.albumTitle)
})

test('rejects old array responses and malformed album metadata or nested tracks', async () => {
  const invalidTracks = [null, {}, { ...albumTrack, bucketName: '' },
    { ...albumTrack, trackId: '' }, { ...albumTrack, trackTitle: {} },
    { ...albumTrack, trackTitle: undefined }, { ...albumTrack, trackDuration: '12000' },
    { ...albumTrack, trackDuration: -1 }, { ...albumTrack, trackDuration: undefined }]
  for (const body of [null, [], [track], {}, { ...album, albumId: null },
    { ...album, albumId: ' ' }, { ...album, albumTitle: undefined },
    { ...album, albumTitle: {} }, { ...album, author: undefined }, { ...album, author: {} },
    { ...album, albumTracks: undefined }, { ...album, albumTracks: {} },
    ...invalidTracks.map((entry) => ({ ...album, albumTracks: [entry] }))]) {
    mock.method(globalThis, 'fetch', async () => Response.json(body))
    await assert.rejects(getAlbumTracks(track.albumId), /unexpected album/)
    mock.restoreAll()
  }
})

test('preserves HTTP status so missing albums are distinct from server failures', async () => {
  for (const status of [404, 500]) {
    mock.method(globalThis, 'fetch', async () => new Response('Not found or unavailable', { status }))
    await assert.rejects(getAlbumTracks(track.albumId), (error) => error.status === status)
    mock.restoreAll()
  }
})

test('arbitrary route IDs reach the backend unchanged and preserve validation errors', async () => {
  for (const id of ['not-a-uuid', 'Album_ABC', 'album/id?#', '%2F']) {
    let requested = false
    mock.method(globalThis, 'fetch', async (url) => {
      requested = true
      assert.equal(url, `/album/${encodeURIComponent(id)}/tracks`)
      return Response.json({ message: 'Invalid album ID' }, { status: 400 })
    })
    const route = resolveRoute(albumPath(id))
    await assert.rejects(getAlbumTracks(route.albumId), error => error.status === 400)
    assert.equal(requested, true)
    mock.restoreAll()
  }
})

test('escapes album path parameters and forwards cancellation', async () => {
  const controller = new AbortController()
  mock.method(globalThis, 'fetch', async (url, { signal }) => {
    assert.equal(url, '/album/album%2Fid%3F/tracks')
    controller.abort()
    assert.equal(signal.aborted, true)
    throw signal.reason
  })
  await assert.rejects(getAlbumTracks('album/id?', controller.signal), { name: 'AbortError' })
})

test('rejects malformed track responses before rendering', async () => {
  for (const body of [{ tracks: [] }, [null], [{ trackId: 'id' }],
    [{ ...track, trackTitle: {} }], [{ ...track, author: {} }],
    [{ ...track, trackDuration: '12000' }], [{ ...track, trackDuration: -1 }],
    [{ ...track, albumId: null }], [{ ...track, albumId: '' }],
    [{ ...track, albumTitle: {} }], [{ ...track, albumTitle: undefined }]]) {
    mock.method(globalThis, 'fetch', async () => Response.json(body))
    await assert.rejects(getTracks(), /unexpected track list/)
    mock.restoreAll()
  }
})

test('reads signed URLs from JSON and escapes both path parameters', async () => {
  mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/track/a%2Fb%20c/track%2Fid')
    assert.equal(options.cache, 'no-store')
    return Response.json({ trackPresignedLink: ' https://r2.example/audio?X-Amz-Signature=abc\n' })
  })
  assert.equal(await getPlaybackUrl({ bucketName: 'a/b c', trackId: 'track/id' }),
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
  assert.equal(trackDurationSeconds({ trackDuration: 90500 }), 90.5)
  assert.equal(trackDurationSeconds({ trackDuration: 0 }), 0)
  assert.equal(trackDurationSeconds({}), null)
  assert.equal(trackLabel({ ...track, trackTitle: ' ' }), 'Track 550e8400')
  assert.equal(trackAuthor({ ...track, author: null }), 'music-bucket')
  assert.equal(getSigningEndpoint({ bucketName: 'a/b c', trackId: 'track/id' }), '/track/a%2Fb%20c/track%2Fid')
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
