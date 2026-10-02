import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { AudioPreloader, fetchPrefix, PRELOAD_BYTES } from '../src/lib/audio-preload.js'
import { createAudioResponse, parseRange } from '../public/audio-preload-worker.js'

afterEach(() => mock.restoreAll())
const file = Uint8Array.from({ length: 24 }, (_, index) => index)
const source = () => ({
  path: '/__audio_preload__/test', prefix: file.slice(0, 8).buffer,
  total: file.length, type: 'audio/wav', url: 'https://r2.example/old',
  signedAt: Date.now(), signingEndpoint: 'https://app.example/track/bucket/track',
})
const request = (range) => new Request('https://app.example/__audio_preload__/test', {
  headers: range ? { Range: range } : {},
})
const bytes = async (response) => new Uint8Array(await response.arrayBuffer())
const tail = (calls) => async (_source, start, end) => {
  calls.push({ start, end })
  return new Response(file.slice(start, end + 1))
}

test('preloads exactly 2.5 decimal MB using a single byte range', async () => {
  mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.headers.Range, 'bytes=0-2499999')
    return new Response(new Uint8Array(PRELOAD_BYTES), { status: 206, headers: {
      'Content-Range': `bytes 0-${PRELOAD_BYTES - 1}/21000000`, 'Content-Type': 'audio/wav',
    } })
  })
  const result = await fetchPrefix('https://r2.example/audio', new AbortController().signal)
  assert.equal(result.prefix.byteLength, PRELOAD_BYTES)
  assert.equal(result.total, 21_000_000)
  assert.equal(result.audioType, 'audio/wav')
})

test('a short file is completely cached', async () => {
  mock.method(globalThis, 'fetch', async () => new Response(file, {
    status: 206, headers: { 'Content-Range': 'bytes 0-23/24' },
  }))
  const result = await fetchPrefix('https://r2.example/audio', new AbortController().signal)
  assert.deepEqual(new Uint8Array(result.prefix), file)
})

test('refuses ignored ranges, hidden CORS headers, and truncated prefixes', async () => {
  for (const response of [
    new Response(file),
    new Response(file, { status: 206 }),
    new Response(file.slice(0, 3), { status: 206, headers: { 'Content-Range': 'bytes 0-23/24' } }),
  ]) {
    mock.method(globalThis, 'fetch', async () => response)
    await assert.rejects(fetchPrefix('https://r2.example/audio', new AbortController().signal))
    mock.restoreAll()
  }
})

test('plays cached prefix before the tail arrives, with no duplicated bytes', async () => {
  let release
  const calls = []
  const gate = new Promise((resolve) => { release = resolve })
  const response = createAudioResponse(request('bytes=0-'), source(), async (...args) => {
    await gate
    return tail(calls)(...args)
  })
  assert.equal(response.status, 206)
  assert.equal(response.headers.get('Content-Range'), 'bytes 0-23/24')
  const reader = response.body.getReader()
  assert.deepEqual((await reader.read()).value, file.slice(0, 8))
  release()
  assert.deepEqual((await reader.read()).value, file.slice(8))
  assert.equal((await reader.read()).done, true)
  assert.deepEqual(calls, [{ start: 8, end: 23 }])
})

test('serves a full GET as prefix plus continuation', async () => {
  const calls = []
  const response = createAudioResponse(request(), source(), tail(calls))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Content-Length'), '24')
  assert.deepEqual(await bytes(response), file)
  assert.deepEqual(calls, [{ start: 8, end: 23 }])
})

test('seeking inside, across, and beyond the prefix returns the exact requested bytes', async () => {
  for (const [range, start, end, expectedCalls] of [
    ['bytes=2-5', 2, 5, []],
    ['bytes=4-12', 4, 12, [{ start: 8, end: 12 }]],
    ['bytes=10-', 10, 23, [{ start: 10, end: 23 }]],
    ['bytes=-4', 20, 23, [{ start: 20, end: 23 }]],
    ['bytes=0-100', 0, 23, [{ start: 8, end: 23 }]],
  ]) {
    const calls = []
    assert.deepEqual(await bytes(createAudioResponse(request(range), source(), tail(calls))), file.slice(start, end + 1))
    assert.deepEqual(calls, expectedCalls)
  }
})

test('complete cached files need no network request', async () => {
  const complete = { ...source(), prefix: file.buffer }
  const response = createAudioResponse(request('bytes=0-'), complete, () => assert.fail('Unexpected network'))
  assert.deepEqual(await bytes(response), file)
})

test('invalid and unsatisfiable ranges return 416', () => {
  for (const range of ['bytes=24-', 'bytes=9-2', 'bytes=-0', 'bytes=-', 'bytes=0-1,8-9', 'bad']) {
    assert.equal(parseRange(range, 24), null)
    assert.equal(createAudioResponse(request(range), source()).status, 416)
  }
})

test('refreshes expired signatures while retaining the cached prefix', async () => {
  const expired = { ...source(), path: '/expired', signedAt: Date.now() - 120_000 }
  const calls = []
  mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(url)
    if (url === expired.signingEndpoint) return Response.json({ trackPresignedLink: 'https://r2.example/fresh' })
    assert.equal(options.headers.Range, 'bytes=8-23')
    return new Response(file.slice(8), { status: 206, headers: { 'Content-Range': 'bytes 8-23/24' } })
  })
  assert.deepEqual(await bytes(createAudioResponse(request(), expired)), file)
  assert.deepEqual(calls, [expired.signingEndpoint, 'https://r2.example/fresh'])
})

test('retries a rejected signature once and keeps the continuation offset', async () => {
  const current = { ...source(), path: '/rejected' }
  const calls = []
  mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(url)
    if (url === current.signingEndpoint) return Response.json({ trackPresignedLink: 'https://r2.example/retry' })
    if (url === current.url) return new Response(null, { status: 403 })
    assert.equal(options.headers.Range, 'bytes=8-23')
    return new Response(file.slice(8), { status: 206, headers: { 'Content-Range': 'bytes 8-23/24' } })
  })
  assert.deepEqual(await bytes(createAudioResponse(request(), current)), file)
  assert.deepEqual(calls, [current.url, current.signingEndpoint, 'https://r2.example/retry'])
})

test('rejects a continuation that ignores Range or returns a different object size', async () => {
  for (const response of [new Response(file), new Response(file.slice(8), {
    status: 206, headers: { 'Content-Range': 'bytes 8-23/25' },
  })]) {
    mock.method(globalThis, 'fetch', async () => response)
    await assert.rejects(bytes(createAudioResponse(request(), source())), /continuation did not match/)
    mock.restoreAll()
  }
})

test('rejects a truncated continuation rather than silently ending the song', async () => {
  await assert.rejects(bytes(createAudioResponse(request(), source(), async () => new Response(file.slice(8, 10)))), /Incomplete/)
})

test('canceling playback aborts its continuation request', async () => {
  let signal
  const response = createAudioResponse(request(), source(), async (_source, _start, _end, nextSignal) => {
    signal = nextSignal
    return new Response(file.slice(8))
  })
  const reader = response.body.getReader()
  await reader.read()
  await reader.read()
  await reader.cancel()
  assert.equal(signal.aborted, true)
})

test('changing the predicted track cancels the old preload', () => {
  const preloader = new AudioPreloader()
  const controller = new AbortController()
  preloader.next = { key: 'old/track', controller }
  preloader.preload(null)
  assert.equal(controller.signal.aborted, true)
  assert.equal(preloader.next, null)
})

test('failed preload falls back to an already acquired, valid signed URL', async () => {
  const preloader = new AudioPreloader()
  preloader.next = {
    key: 'bucket/track', ready: Promise.resolve(), controller: new AbortController(),
    url: 'https://r2.example/valid', signedAt: Date.now(),
  }
  mock.method(globalThis, 'fetch', () => assert.fail('Unnecessary signing call'))
  const result = await preloader.source({ bucketName: 'bucket', trackId: 'track' }, new AbortController().signal)
  assert.equal(result.url, 'https://r2.example/valid')
  assert.equal(result.cached, false)
})

test('selection renews an expired preload URL through the JSON signing API', async () => {
  const preloader = new AudioPreloader()
  preloader.next = {
    key: 'bucket/track', ready: Promise.resolve(), controller: new AbortController(),
    url: 'https://r2.example/expired', signedAt: Date.now() - 120_000,
  }
  mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, '/track/bucket/track')
    return Response.json({ trackPresignedLink: 'https://r2.example/renewed' })
  })
  const result = await preloader.source({ bucketName: 'bucket', trackId: 'track' }, new AbortController().signal)
  assert.equal(result.url, 'https://r2.example/renewed')
  assert.equal(result.cached, false)
  assert.ok(Date.now() - result.signedAt < 1000)
})

test('worker refuses invalid JSON signing payloads before fetching audio', async () => {
  for (const [index, body] of [null, {}, { trackPresignedLink: 123 },
    { trackPresignedLink: 'javascript:alert(1)' }].entries()) {
    const expired = { ...source(), path: `/invalid-signature-${index}`, signedAt: Date.now() - 120_000 }
    mock.method(globalThis, 'fetch', async (url) => {
      assert.equal(url, expired.signingEndpoint)
      return Response.json(body)
    })
    await assert.rejects(bytes(createAudioResponse(request(), expired)), /Invalid audio URL/)
    mock.restoreAll()
  }
})

test('canceling selection cancels an in-flight preload', async () => {
  const preloader = new AudioPreloader()
  const controller = new AbortController()
  preloader.next = {
    key: 'bucket/track', controller,
    ready: new Promise((resolve) => controller.signal.addEventListener('abort', resolve)),
  }
  const selection = new AbortController()
  const pending = preloader.source({ bucketName: 'bucket', trackId: 'track' }, selection.signal)
  selection.abort()
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(controller.signal.aborted, true)
})

test('a slow preload is abandoned so selection can use native playback', { timeout: 2000 }, async () => {
  const preloader = new AudioPreloader()
  const controller = new AbortController()
  preloader.next = {
    key: 'bucket/track', controller, ready: new Promise(() => {}),
    url: 'https://r2.example/valid', signedAt: Date.now(),
  }
  mock.method(globalThis, 'fetch', () => assert.fail('Unnecessary signing call'))
  const result = await preloader.source({ bucketName: 'bucket', trackId: 'track' }, new AbortController().signal)
  assert.equal(result.url, 'https://r2.example/valid')
  assert.equal(controller.signal.aborted, true)
})

test('cached selection publishes the prefix, preserves track identity and releases its cache', async () => {
  const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { href: 'https://app.example/home' } })
  try {
    const messages = []
    const worker = { postMessage(message, [port]) {
      messages.push(message)
      port.postMessage({ ok: true })
      port.close()
    } }
    const preloader = new AudioPreloader()
    const signedAt = Date.now() - 130_000
    preloader.next = {
      key: 'bucket/track', controller: new AbortController(), ready: Promise.resolve(), worker,
      url: 'https://r2.example/expired', signedAt,
      data: { prefix: file.buffer, total: file.length, audioType: 'audio/wav' },
    }
    mock.method(globalThis, 'fetch', () => assert.fail('Cached playback does not wait for signing'))
    const result = await preloader.source({ bucketName: 'bucket', trackId: 'track' }, new AbortController().signal)
    assert.equal(result.cached, true)
    assert.equal(result.signedAt, signedAt)
    assert.match(result.url, /^\/__audio_preload__\//)
    assert.equal(messages[0].type, 'store')
    assert.equal(messages[0].audioType, 'audio/wav')
    assert.equal(messages[0].signingEndpoint, 'https://app.example/track/bucket/track')
    assert.equal(preloader.next, null)
    preloader.release()
    assert.deepEqual(messages[1], { type: 'release', path: result.url })
    assert.equal(preloader.active, null)
  } finally {
    if (originalLocation) Object.defineProperty(globalThis, 'location', originalLocation)
    else delete globalThis.location
  }
})
