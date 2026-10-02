import assert from 'node:assert/strict'
import { afterEach, test, mock } from 'node:test'
import { getAlbumTracks, getPlaybackUrl, getSigningEndpoint, getTracks } from '../src/lib/music-api.js'
import { trackAuthor, trackDurationSeconds, trackLabel } from '../src/lib/tracks.js'

afterEach(() => mock.restoreAll())
const track = {
  bucketName: 'music-bucket', trackId: '550e8400-e29b-41d4-a716-446655440000',
  trackTitle: 'Industrial Drum', trackDuration: 12000, author: 'looplicator',
  albumId: '00000000-0000-0000-0000-000000000001', albumTitle: 'Industrial Drum',
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

test('loads albums by UUID from the same direct-array contract', async () => {
  mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, `/album/${track.albumId}/tracks`)
    return Response.json([track, track])
  })
  assert.deepEqual(await getAlbumTracks(track.albumId), [track])
})

test('treats an empty or nonexistent album as an empty list', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json([]))
  assert.deepEqual(await getAlbumTracks('00000000-0000-0000-0000-000000000099'), [])
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
    await assert.rejects(getAlbumTracks(track.albumId), /unexpected track list/)
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
