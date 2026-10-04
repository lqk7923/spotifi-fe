import { CircleAlert } from 'lucide-react'
import Artwork from '../components/Artwork.jsx'
import TrackLibrary from '../components/TrackLibrary.jsx'
import { timeLabel } from '../lib/format.js'
import { trackDurationSeconds } from '../lib/tracks.js'

export default function AlbumPage({ library, player, libraryRef }) {
  const { selectedAlbum, collectionTracks, loading, error, albumNotFound } = library

  if (loading) {
    return <p className="sr-only" role="status">Loading album…</p>
  }

  if (albumNotFound) {
    return (
      <section className="album-not-found" aria-labelledby="album-not-found-title" role="status">
        <CircleAlert size={72} strokeWidth={2} aria-hidden="true" />
        <h1 id="album-not-found-title">Could not find that album</h1>
        <p>Search for something else?</p>
      </section>
    )
  }

  if (error) {
    return (
      <div className="content-sections album-content">
        <TrackLibrary library={library} player={player} libraryRef={libraryRef} />
      </div>
    )
  }

  const duration = collectionTracks.reduce((total, track) => total + (trackDurationSeconds(track) || 0), 0)

  return (
    <>
      <section className="album-hero" aria-labelledby="album-title">
        <div className="album-identity">
          <Artwork track={collectionTracks[0] || selectedAlbum} />
          <div className="album-details">
            <p className="album-type">Album</p>
            <h1 id="album-title">{selectedAlbum.albumTitle || 'Album'}</h1>
            <p className="album-meta">
              {selectedAlbum.author && <><span className="album-author">{selectedAlbum.author}</span><span aria-hidden="true"> · </span></>}
              <span>{collectionTracks.length} {collectionTracks.length === 1 ? 'song' : 'songs'}</span>
              {duration > 0 && <><span aria-hidden="true">, </span><span className="album-total-duration">{timeLabel(duration)}</span></>}
            </p>
          </div>
        </div>
      </section>
      <div className="content-sections album-content">
        <TrackLibrary library={library} player={player} libraryRef={libraryRef} />
      </div>
    </>
  )
}
