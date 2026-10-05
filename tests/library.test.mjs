import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterTracks, getAlbums, migrateLikes, trackKey } from '../src/lib/tracks.js'
import { albumReleaseDate, greetingLabel, timeLabel } from '../src/lib/format.js'
import { artworkColors } from '../src/lib/artwork.js'

const tracks = [
  { trackId: 'first', trackTitle: 'Industrial Drum', author: 'looplicator', trackDuration: 12000, albumId: 'album-1', albumTitle: 'Factory Sounds' },
  { trackId: 'second', trackTitle: 'Night Air', author: 'another artist', trackDuration: 90500, albumId: 'album-2', albumTitle: 'Evening' },
]
const filters = { likedOnly: false, likes: [], search: '' }

test('tracks in the same album share the album cover palette across pages and queue', () => {
  assert.deepEqual(artworkColors(tracks[0]), artworkColors({ ...tracks[0], trackId: 'another-track', albumTitle: 'Renamed album' }))
  assert.deepEqual(artworkColors(tracks[0]), artworkColors({ albumId: tracks[0].albumId }))
})

test('library search matches API titles, authors, IDs, and collections', () => {
  for (const search of [' INDUSTRIAL ', 'Looplicator', 'first', 'Factory Sounds', 'album-1']) {
    assert.deepEqual(filterTracks(tracks, { ...filters, search }), [tracks[0]])
  }
  assert.deepEqual(filterTracks(tracks, { ...filters, search: 'missing' }), [])
})

test('groups albums by identity even when titles are shared', () => {
  const duplicate = { ...tracks[0], trackId: 'third' }
  const sameTitle = { ...tracks[1], albumTitle: tracks[0].albumTitle }
  assert.deepEqual(getAlbums([tracks[0], duplicate, sameTitle]), [
    { albumId: 'album-1', albumTitle: 'Factory Sounds', author: 'looplicator', albumCoverPresignedUrl: null },
    { albumId: 'album-2', albumTitle: 'Factory Sounds', author: 'another artist', albumCoverPresignedUrl: null },
  ])
  assert.deepEqual(getAlbums([]), [])
})

test('library combines likes and search without changing the playback list', () => {
  const likes = [trackKey(tracks[1])]
  assert.deepEqual(filterTracks(tracks, { ...filters, likedOnly: true, likes }), [tracks[1]])
  assert.deepEqual(filterTracks(tracks, { ...filters, likedOnly: true, likes, search: 'Industrial' }), [])
  assert.equal(tracks.length, 2)
})

test('migrates saved likes from bucket/trackId and removes duplicates', () => {
  assert.deepEqual(migrateLikes(['bucket/first', 'first', null, 1, 'other/second']), ['first', 'second'])
  assert.deepEqual(migrateLikes({}), [])
})

test('album cards preserve a cover supplied by any track in the album', () => {
  const result = getAlbums([{ ...tracks[0], coverPresignedUrl: 'https://r2.example/cover.jpg' }, tracks[0]])
  assert.equal(result[0].albumCoverPresignedUrl, 'https://r2.example/cover.jpg')
})

test('release dates show a year and an English Month dd yyyy tooltip without timezone shifts', () => {
  assert.deepEqual(albumReleaseDate('2026-10-05'), { year: '2026', iso: '2026-10-05', full: 'October 05 2026' })
  assert.equal(albumReleaseDate('2024-02-29T00:00:00+07:00').full, 'February 29 2024')
  for (const value of [null, '', 'invalid', '2025-02-29', '2026-13-01']) assert.equal(albumReleaseDate(value), null)
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
