import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterTracks, trackKey } from '../src/lib/tracks.js'
import { greetingLabel, timeLabel } from '../src/lib/format.js'

const tracks = [
  { bucketName: 'drums', trackId: 'first', trackTitle: 'Industrial Drum', author: 'looplicator', trackDuration: 12000 },
  { bucketName: 'ambient', trackId: 'second', trackTitle: 'Night Air', author: 'another artist', trackDuration: 90500 },
]
const filters = { bucket: '', likedOnly: false, likes: [], search: '' }

test('library search matches API titles, authors, IDs, and collections', () => {
  for (const search of [' INDUSTRIAL ', 'Looplicator', 'first', 'drums']) {
    assert.deepEqual(filterTracks(tracks, { ...filters, search }), [tracks[0]])
  }
  assert.deepEqual(filterTracks(tracks, { ...filters, search: 'missing' }), [])
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
