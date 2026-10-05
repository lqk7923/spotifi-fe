import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bannerColorFromPixels } from '../src/lib/cover-colors.js'
import { createCoverColorCache } from '../src/services/cover-color-cache.js'

const pixels = (...groups) => new Uint8ClampedArray(groups.flatMap(([count, rgba]) => Array.from({ length: count }, () => rgba).flat()))
const channels = color => color.slice(1).match(/../g).map(hex => parseInt(hex, 16))
const item = { albumId: 'album', albumCoverPresignedUrl: 'https://r2.example/cover.jpg?X-Amz-Signature=first' }

function storage() {
  let saved = null
  return { getItem: () => saved, setItem: (_key, value) => { saved = value } }
}

test('banner hue follows the dominant cover region instead of blending opposing colors', () => {
  const [r, g, b] = channels(bannerColorFromPixels(pixels([70, [220, 40, 30, 255]], [30, [30, 40, 220, 255]])))
  assert.ok(r > g * 3 && r > b * 3)
})

test('white and black borders and transparent pixels do not overpower a colored cover', () => {
  const [r, g, b] = channels(bannerColorFromPixels(pixels(
    [40, [255, 255, 255, 255]], [40, [0, 0, 0, 255]], [20, [20, 180, 40, 255]], [100, [255, 0, 0, 0]],
  )))
  assert.ok(g > r * 3 && g > b * 3)
})

test('monochrome images stay neutral, even with a tiny saturated accent', () => {
  for (const rgb of [[255, 255, 255], [0, 0, 0], [150, 150, 150]]) {
    const [r, g, b] = channels(bannerColorFromPixels(pixels([100, [...rgb, 255]])))
    assert.equal(r, g)
    assert.equal(g, b)
  }
  const result = channels(bannerColorFromPixels(pixels([99, [180, 180, 180, 255]], [1, [255, 0, 0, 255]])))
  assert.ok(Math.max(...result) - Math.min(...result) < 3)
  assert.equal(bannerColorFromPixels(pixels([10, [255, 255, 255, 0]])), null)
})

test('bright covers keep a lighter banner while retaining contrast with white headings', () => {
  const luminance = rgb => rgb.map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0)
  for (const rgb of [[255, 255, 255], [255, 255, 0], [0, 255, 0], [255, 0, 0], [0, 0, 255], [200, 100, 40]]) {
    const background = channels(bannerColorFromPixels(pixels([100, [...rgb, 255]])))
    const brightness = luminance(background)
    const contrast = 1.05 / (brightness + 0.05)
    assert.ok(contrast >= 7, `${rgb} produced contrast ${contrast}`)
    if (luminance(rgb) > 0.1) assert.ok(brightness > 0.08, `${rgb} was darkened too much`)
  }
})

test('concurrent consumers share one blob load and extraction across signed URL changes', async () => {
  let loads = 0
  let extractions = 0
  const cache = createCoverColorCache({ getStorage: () => null,
    loadCover: async () => { loads++; return new Blob(['cover']) },
    extract: async () => { extractions++; return '#123456' },
  })
  const changedSignature = { ...item, albumCoverPresignedUrl: item.albumCoverPresignedUrl.replace('first', 'second') }
  assert.deepEqual(await Promise.all([cache.load(item), cache.load(changedSignature)]), ['#123456', '#123456'])
  assert.equal(cache.peek(changedSignature), '#123456')
  await cache.load(item)
  assert.equal(loads, 1)
  assert.equal(extractions, 1)
})

test('persisted colors survive a page reload without loading or decoding the image', async () => {
  const saved = storage()
  await createCoverColorCache({ getStorage: () => saved, loadCover: async () => new Blob(), extract: async () => '#123456' }).load(item)
  const cache = createCoverColorCache({ getStorage: () => saved, loadCover: () => assert.fail('Unexpected image load') })
  assert.equal(cache.peek(item), '#123456')
  assert.equal(await cache.load(item), '#123456')
})

test('new cover paths invalidate colors and persisted entries remain bounded', async () => {
  const saved = storage()
  let calls = 0
  const cache = createCoverColorCache({ getStorage: () => saved, loadCover: async () => new Blob(),
    extract: async () => { calls++; return '#123456' },
  })
  for (let index = 0; index < 102; index++) await cache.load({ albumCoverPresignedUrl: `https://r2.example/cover-${index}.jpg` })
  assert.equal(calls, 102)
  assert.equal(JSON.parse(saved.getItem()).length, 100)
  assert.equal(cache.peek({ albumCoverPresignedUrl: 'https://r2.example/cover-0.jpg' }), undefined)
})

test('blocked storage and invalid persisted data do not prevent extraction', async () => {
  for (const getStorage of [() => { throw new Error('Blocked') }, () => ({ getItem: () => 'invalid JSON', setItem: () => {} }),
    () => ({ getItem: () => JSON.stringify([['https://r2.example/cover.jpg', 'invalid color']]), setItem: () => {} })]) {
    const cache = createCoverColorCache({ getStorage, loadCover: async () => new Blob(), extract: async () => '#123456' })
    assert.equal(await cache.load(item), '#123456')
    assert.equal(cache.peek(item), '#123456')
  }
})

test('failed extraction can retry and missing covers never trigger image requests', async () => {
  let attempts = 0
  const cache = createCoverColorCache({ getStorage: () => null, loadCover: async () => new Blob(), extract: async () => {
    if (!attempts++) throw new Error('Decode failed')
    return '#123456'
  } })
  assert.equal(await cache.load({ albumId: 'no-cover' }), null)
  assert.equal(attempts, 0)
  await assert.rejects(cache.load(item), /Decode failed/)
  assert.equal(await cache.load(item), '#123456')
})
