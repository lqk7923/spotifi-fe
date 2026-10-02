import assert from 'node:assert/strict'
import { test } from 'node:test'
import { albumPath, navigate, resolveRoute } from '../src/lib/navigation.js'

const albumId = '550e8400-e29b-41d4-a716-446655440000'

test('home is the root and albums resolve from UUID deep links', () => {
  assert.deepEqual(resolveRoute('/'), { page: 'home' })
  assert.deepEqual(resolveRoute(albumPath(albumId)), { page: 'album', albumId })
  assert.deepEqual(resolveRoute(`/album/${albumId.toUpperCase()}/`), { page: 'album', albumId })
})

test('invalid paths do not become album API requests', () => {
  for (const path of ['/missing', '/album', '/album/not-a-uuid', `/album/${albumId}/tracks`, `/album/${albumId}/extra`]) {
    assert.deepEqual(resolveRoute(path), { page: 'not-found' })
  }
})

test('album links escape IDs as one path segment', () => {
  assert.equal(albumPath('album/id?'), '/album/album%2Fid%3F')
})

test('navigation adds history and notifies the router without a document reload', (t) => {
  for (const name of ['window', 'PopStateEvent']) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name)
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    })
  }
  const entries = []
  const events = []
  globalThis.window = {
    location: { origin: 'https://spotifi.example', href: 'https://spotifi.example/' },
    history: { pushState: (...args) => entries.push(args) },
    dispatchEvent: event => events.push(event.type),
  }
  globalThis.PopStateEvent = class { constructor(type) { this.type = type } }
  navigate(`${albumPath(albumId)}?view=tracks#all-tracks`)
  assert.deepEqual(entries, [[null, '', `${albumPath(albumId)}?view=tracks#all-tracks`]])
  assert.deepEqual(events, ['popstate'])
  navigate('/')
  assert.equal(entries.length, 1)
})
