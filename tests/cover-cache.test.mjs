import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { coverCacheKey, coverUrl, createCoverCache } from '../src/services/cover-cache.js'

afterEach(() => mock.restoreAll())
const item = { trackId: 'track', albumId: 'album', coverPresignedUrl: 'https://r2.example/album/cover.png?X-Amz-Signature=old&X-Amz-Date=20261005T000000Z' }
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

test('all three API cover fields are supported and unsafe URLs are ignored', () => {
  for (const field of ['coverPresignedUrl', 'albumCoverPresignedUrl', 'coverPresignedLink']) {
    assert.equal(coverUrl({ [field]: item.coverPresignedUrl }), item.coverPresignedUrl)
  }
  for (const value of [null, 4, '', 'javascript:alert(1)', 'file:///image.png']) {
    assert.equal(coverUrl({ coverPresignedUrl: value }), null)
  }
})

test('cache identity ignores signed credentials but retains object versions', () => {
  assert.equal(coverCacheKey(item.coverPresignedUrl), 'https://r2.example/album/cover.png')
  assert.equal(coverCacheKey(`${item.coverPresignedUrl}&version=2`), 'https://r2.example/album/cover.png?version=2')
})

test('simultaneous cards and tracks share one download and subsequent memory hits', async () => {
  let downloads = 0
  const cache = createCoverCache({ storage: null, fetcher: async () => { downloads++; return imageResponse() } })
  const [first, second] = await Promise.all([cache.load(item), cache.load({ ...item, trackId: 'other' })])
  assert.equal(first, second)
  assert.equal(await cache.load({ ...item, coverPresignedUrl: item.coverPresignedUrl.replace('old', 'new') }), first)
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
  assert.deepEqual(requests, [item.coverPresignedUrl, 'https://r2.example/fresh.png'])
  assert.equal(renewals, 1)
})

test('expired track and album covers use their respective new API contracts', async () => {
  for (const metadata of [item, { albumId: 'album', albumCoverPresignedUrl: item.coverPresignedUrl }]) {
    const requests = []
    mock.method(globalThis, 'fetch', async url => {
      requests.push(url)
      if (url === item.coverPresignedUrl) return new Response(null, { status: 403 })
      if (url === '/track/track/track') return Response.json({ coverPresignedLink: 'https://r2.example/fresh.png' })
      if (url === '/album/album/tracks') return Response.json({ albumId: 'album', albumTitle: 'Album', author: 'Artist', albumTracks: [], albumCoverPresignedUrl: 'https://r2.example/fresh.png' })
      assert.equal(url, 'https://r2.example/fresh.png')
      return imageResponse()
    })
    await createCoverCache({ storage: null }).load(metadata)
    assert.equal(requests[1], metadata.trackId ? '/track/track/track' : '/album/album/tracks')
    assert.equal(requests.length, 3)
    mock.restoreAll()
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
    await cache.load({ ...item, coverPresignedUrl: `https://r2.example/cover-${index}.png` })
  }
  const keys = await (await storage.open()).keys()
  assert.equal(keys.length, 100)
  assert.equal(downloads, 102)
  assert.equal(keys.includes('https://r2.example/cover-0.png'), false)
})
