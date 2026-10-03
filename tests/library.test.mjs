import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterTracks, getAlbums, trackKey } from '../src/lib/tracks.js'
import { greetingLabel, timeLabel } from '../src/lib/format.js'
import { artworkColors } from '../src/lib/artwork.js'

const tracks = [
  { bucketName: 'drums', trackId: 'first', trackTitle: 'Industrial Drum', author: 'looplicator', trackDuration: 12000, albumId: 'album-1', albumTitle: 'Factory Sounds' },
  { bucketName: 'ambient', trackId: 'second', trackTitle: 'Night Air', author: 'another artist', trackDuration: 90500, albumId: 'album-2', albumTitle: 'Evening' },
]
const filters = { bucket: '', likedOnly: false, likes: [], search: '' }

test('tracks in the same album share the album cover palette across pages and queue', () => {
  assert.deepEqual(artworkColors(tracks[0]), artworkColors({ ...tracks[0], trackId: 'another-track', albumTitle: 'Renamed album' }))
  assert.deepEqual(artworkColors(tracks[0]), artworkColors({ albumId: tracks[0].albumId }))
})

test('library search matches API titles, authors, IDs, and collections', () => {
  for (const search of [' INDUSTRIAL ', 'Looplicator', 'first', 'drums', 'Factory Sounds', 'album-1']) {
    assert.deepEqual(filterTracks(tracks, { ...filters, search }), [tracks[0]])
  }
  assert.deepEqual(filterTracks(tracks, { ...filters, search: 'missing' }), [])
})

test('groups albums by identity even when titles or buckets are shared', () => {
  const duplicate = { ...tracks[0], trackId: 'third', bucketName: 'another-bucket' }
  const sameTitle = { ...tracks[1], albumTitle: tracks[0].albumTitle }
  assert.deepEqual(getAlbums([tracks[0], duplicate, sameTitle]), [
    { albumId: 'album-1', albumTitle: 'Factory Sounds', author: 'looplicator' },
    { albumId: 'album-2', albumTitle: 'Factory Sounds', author: 'another artist' },
  ])
  assert.deepEqual(getAlbums([]), [])
})

test('library combines likes and collection filters without changing the playback list', () => {
  const likes = [trackKey(tracks[1])]
  assert.deepEqual(filterTracks(tracks, { ...filters, likedOnly: true, likes }), [tracks[1]])
  assert.deepEqual(filterTracks(tracks, { ...filters, likedOnly: true, likes, bucket: 'drums' }), [])
  assert.equal(tracks.length, 2)
})

test('duration formatting handles milliseconds converted to fractional seconds', () => {
  assert.equal(timeLabel(12), '0:12')
  assert.equal(timeLabel(90.5), '1:30')
  assert.equal(timeLabel(NaN), '0:00')
})

test('greeting uses Vietnam time regardless of the runtime timezone', () => {
  assert.equal(greetingLabel(new Date('2026-10-02T01:00:00Z')), 'Good morning')
  assert.equal(greetingLabel(new Date('2026-10-02T06:00:00Z')), 'Good afternoon')
  assert.equal(greetingLabel(new Date('2026-10-02T12:00:00Z')), 'Good evening')
})
