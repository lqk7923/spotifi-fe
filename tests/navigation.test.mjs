import assert from 'node:assert/strict'
import { test } from 'node:test'
import { albumPath, navigate, resolveRoute } from '../src/app/routing/navigation.js'

const albumId = '550e8400-e29b-41d4-a716-446655440000'

test('home is the root and album deep links preserve ID casing', () => {
  assert.deepEqual(resolveRoute('/'), { page: 'home' })
  assert.deepEqual(resolveRoute(albumPath(albumId)), { page: 'album', albumId })
  assert.deepEqual(resolveRoute(`/album/${albumId.toUpperCase()}/`), { page: 'album', albumId: albumId.toUpperCase() })
})

test('album routes accept arbitrary IDs and decode URL encoding exactly once', () => {
  for (const id of ['123', '0', 'not-a-uuid', 'Album_ABC', 'album/id?#', 'nhạc Việt', ' ', '%2F', '%']) {
    assert.deepEqual(resolveRoute(albumPath(id)), { page: 'album', albumId: id })
  }
})

test('malformed URL escapes still reach the album route without crashing', () => {
  for (const id of ['bad%id', '%E0%A4%A']) {
    assert.deepEqual(resolveRoute(`/album/${id}`), { page: 'album', albumId: id })
  }
})

test('missing IDs and unrelated paths do not become album API requests', () => {
  for (const path of ['/missing', '/album', '/album/', '/album//', `/album/${albumId}/tracks`, `/album/${albumId}/extra`]) {
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
