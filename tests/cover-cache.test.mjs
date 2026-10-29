import assert from 'node:assert/strict'
import { beforeEach, afterEach, mock, test } from 'node:test'
import { coverCacheKey, coverUrl, createCoverCache } from '../src/services/cover-cache.js'
import { auth } from '../src/services/keycloak.js'

afterEach(() => mock.restoreAll())
beforeEach(context => {
  context.mock.method(auth, 'getAccessToken', async () => 'test-access-token')
  context.mock.method(auth, 'getSnapshot', () => ({ status: 'authenticated' }))
})
const item = { trackId: 'track', albumId: 'album', coverUrl: 'https://r2.example/album/cover.png?X-Amz-Signature=old&X-Amz-Date=20261005T000000Z' }
const imageResponse = () => new Response(new Blob(['image bytes'], { type: 'image/png' }))

function fakeStorage() {
  const entries = new Map()
  return { open: async () => ({
    match: async key => entries.get(key)?.clone(),
    put: async (key, response) => { entries.set(key, response.clone()) },
    keys: async () => [...entries.keys()],
    delete: async key => entries.delete(key),
  }) }
}

test('reads the documented coverUrl field and ignores unsafe URLs', () => {
  assert.equal(coverUrl(item), item.coverUrl)
  for (const value of [null, 4, '', 'javascript:alert(1)', 'file:///image.png']) {
    assert.equal(coverUrl({ coverUrl: value }), null)
  }
})

test('cache identity ignores signed credentials but retains object versions', () => {
  assert.equal(coverCacheKey(item.coverUrl), 'https://r2.example/album/cover.png')
  assert.equal(coverCacheKey(`${item.coverUrl}&version=2`), 'https://r2.example/album/cover.png?version=2')
})

test('simultaneous cards and tracks share one download and subsequent memory hits', async () => {
  let downloads = 0
  const cache = createCoverCache({ storage: null, fetcher: async () => { downloads++; return imageResponse() } })
  const [first, second] = await Promise.all([cache.load(item), cache.load({ ...item, trackId: 'other' })])
  assert.equal(first, second)
  assert.equal(await cache.load({ ...item, coverUrl: item.coverUrl.replace('old', 'new') }), first)
  assert.equal(downloads, 1)
})

test('a new page session reads stored image bytes without fetching or renewing an expired URL', async () => {
  const storage = fakeStorage()
  await createCoverCache({ storage, fetcher: imageResponse }).load(item)
  const cache = createCoverCache({ storage, fetcher: () => assert.fail('Unexpected download'), renew: () => assert.fail('Unexpected renewal') })
  assert.equal(await (await cache.load(item)).text(), 'image bytes')
})

test('an expired uncached cover renews once and stores the replacement image', async () => {
  const requests = []
  let renewals = 0
  const cache = createCoverCache({ storage: null,
    fetcher: async url => {
      requests.push(url)
      return requests.length === 1 ? new Response(null, { status: 403 }) : imageResponse()
    },
    renew: async metadata => { assert.equal(metadata.trackId, item.trackId); renewals++; return 'https://r2.example/fresh.png' },
  })
  assert.equal((await cache.load(item)).type, 'image/png')
  await cache.load(item)
  assert.deepEqual(requests, [item.coverUrl, 'https://r2.example/fresh.png'])
  assert.equal(renewals, 1)
})

test('expired track and album covers renew via metadata without signing audio', async () => {
  for (const metadata of [item, { albumId: 'album', coverUrl: item.coverUrl }]) {
    const requests = []
    mock.method(globalThis, 'fetch', async url => {
      requests.push(url)
      if (url === item.coverUrl) return new Response(null, { status: 403 })
      if (url === '/albums/album') return Response.json({ data: { albumId: 'album', title: 'Album', artist: 'Artist', coverUrl: 'https://r2.example/fresh.png' } })
      assert.equal(url, 'https://r2.example/fresh.png')
      return imageResponse()
    })
    await createCoverCache({ storage: null }).load(metadata)
    assert.equal(requests[1], '/albums/album')
    assert.equal(requests.length, 3)
  }
})

test('blocked storage still displays covers and reuses the memory cache', async () => {
  let downloads = 0
  const cache = createCoverCache({ storage: { open: async () => { throw new Error('Storage blocked') } },
    fetcher: async () => { downloads++; return imageResponse() },
  })
  await cache.load(item)
  await cache.load(item)
  assert.equal(downloads, 1)
})

test('failed downloads are not cached, can retry, and renewal cannot loop', async () => {
  let downloads = 0
  const cache = createCoverCache({ storage: null,
    fetcher: async () => { downloads++; return downloads <= 2 ? new Response(null, { status: 403 }) : imageResponse() },
    renew: async () => 'https://r2.example/fresh.png',
  })
  await assert.rejects(cache.load(item), /Could not load/)
  assert.equal(downloads, 2)
  assert.equal((await cache.load(item)).type, 'image/png')
})

test('missing covers skip all network requests and non-images are rejected', async () => {
  const cache = createCoverCache({ storage: null, fetcher: () => assert.fail('Unexpected request') })
  assert.equal(await cache.load({ albumId: 'album' }), null)
  await assert.rejects(createCoverCache({ storage: null, fetcher: async () => Response.json({ error: 'Missing' }) }).load(item), /did not return an image/)
})

test('persistent cover storage is bounded and changed object paths download new artwork', async () => {
  const storage = fakeStorage()
  let downloads = 0
  const cache = createCoverCache({ storage, fetcher: async () => { downloads++; return imageResponse() } })
  for (let index = 0; index < 102; index++) {
    await cache.load({ ...item, coverUrl: `https://r2.example/cover-${index}.png` })
  }
  const keys = await (await storage.open()).keys()
  assert.equal(keys.length, 100)
  assert.equal(downloads, 102)
  assert.equal(keys.includes('https://r2.example/cover-0.png'), false)
})
