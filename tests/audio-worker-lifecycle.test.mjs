import assert from 'node:assert/strict'
import { test } from 'node:test'

test('rapid selections keep the latest prefix when older cache work is delayed', async () => {
  const originalSelf = Object.getOwnPropertyDescriptor(globalThis, 'self')
  const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches')
  const listeners = new Map()
  const stored = new Map()
  const cache = {
    async keys() { return [...stored.keys()].map((url) => new Request(url)) },
    async match(key) { return stored.get(typeof key === 'string' ? key : key.url)?.clone() },
    async put(key, response) { stored.set(key, response) },
    async delete(key) { return stored.delete(typeof key === 'string' ? key : key.url) },
  }
  let releaseFirst
  const firstGate = new Promise((resolve) => { releaseFirst = resolve })
  let enteredFirst
  const firstStarted = new Promise((resolve) => { enteredFirst = resolve })
  let clientChecks = 0
  const owner = 'test-client'
  Object.defineProperty(globalThis, 'caches', { configurable: true, value: { async open() { return cache } } })
  Object.defineProperty(globalThis, 'self', { configurable: true, value: {
    clients: { async matchAll() {
      if (++clientChecks === 1) { enteredFirst(); await firstGate }
      return [{ id: owner }]
    } },
    registration: { scope: 'https://app.example/' },
    location: { origin: 'https://app.example' },
    addEventListener(type, listener) { listeners.set(type, listener) },
  } })
  const send = (type, path) => {
    let completion
    const replies = []
    listeners.get('message')({
      source: { id: owner },
      data: { type, path, prefix: new Uint8Array([1, 2]).buffer, total: 2,
        url: 'https://r2.example/audio', signedAt: Date.now(), audioType: 'audio/wav',
        signingEndpoint: 'https://app.example/track/bucket/id' },
      ports: [{ postMessage(reply) { replies.push(reply) } }],
      waitUntil(promise) { completion = promise },
    })
    return completion.then(() => assert.deepEqual(replies, [{ ok: true }]))
  }
  try {
    await import('../public/audio-preload-worker.js?lifecycle-test')
    const oldPath = '/__audio_preload__/old'
    const newPath = '/__audio_preload__/new'
    const oldStore = send('store', oldPath)
    await firstStarted
    const newStore = send('store', newPath)
    // Give the newer operation a chance to overtake the delayed old operation.
    await new Promise((resolve) => setImmediate(resolve))
    releaseFirst()
    await Promise.all([oldStore, newStore])
    await send('release', oldPath)
    assert.deepEqual([...stored.keys()], ['https://app.example' + newPath])
    await send('release', newPath)
    assert.equal(stored.size, 0)
  } finally {
    releaseFirst()
    if (originalSelf) Object.defineProperty(globalThis, 'self', originalSelf)
    else delete globalThis.self
    if (originalCaches) Object.defineProperty(globalThis, 'caches', originalCaches)
    else delete globalThis.caches
  }
})
