import assert from 'node:assert/strict'
import { afterEach, test, mock } from 'node:test'
import { getPlaybackUrl, getTracks } from '../src/lib/music-api.js'

afterEach(() => mock.restoreAll())
const track = { bucketName: 'music-bucket', trackId: '550e8400-e29b-41d4-a716-446655440000' }

test('loads the documented track list and removes duplicate identities', async () => {
  mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, '/api-test/all')
    return Response.json([track, track, { ...track, bucketName: 'another-bucket' }])
  })
  assert.equal((await getTracks()).length, 2)
})

test('supports an empty database', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json([]))
  assert.deepEqual(await getTracks(), [])
})

test('rejects malformed track responses before rendering', async () => {
  for (const body of [{ tracks: [] }, [null], [{ trackId: 'id' }]]) {
    mock.method(globalThis, 'fetch', async () => Response.json(body))
    await assert.rejects(getTracks(), /unexpected track list/)
    mock.restoreAll()
  }
})

test('reads signed URLs as plain text and escapes both path parameters', async () => {
  mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, '/api-test/a%2Fb%20c/track%2Fid')
    return new Response(' https://r2.example/audio?X-Amz-Signature=abc\n')
  })
  assert.equal(await getPlaybackUrl({ bucketName: 'a/b c', trackId: 'track/id' }),
    'https://r2.example/audio?X-Amz-Signature=abc')
})

test('does not depend on the backend error body contract', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('<html>internal error</html>', { status: 500 }))
  await assert.rejects(getTracks(), /error \(500\)/)
  await assert.rejects(getPlaybackUrl(track), /error \(500\)/)
})

test('rejects missing or unsafe audio URLs', async () => {
  for (const body of ['', 'not a URL', 'javascript:alert(1)', 'data:audio/wav;base64,abc']) {
    mock.method(globalThis, 'fetch', async () => new Response(body))
    await assert.rejects(getPlaybackUrl(track), /valid audio URL/)
    mock.restoreAll()
  }
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
