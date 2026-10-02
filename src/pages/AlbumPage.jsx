import Artwork from '../components/Artwork.jsx'
import TrackLibrary from '../components/TrackLibrary.jsx'
import { timeLabel } from '../lib/format.js'
import { trackDurationSeconds } from '../lib/tracks.js'

export default function AlbumPage({ library, player, libraryRef }) {
  const { selectedAlbum, collectionTracks, loading, error } = library
  const duration = collectionTracks.reduce((total, track) => total + (trackDurationSeconds(track) || 0), 0)

  return (
    <>
      <section className="album-hero" aria-labelledby="album-title">
        <Artwork track={collectionTracks[0]} />
        <div className="album-details">
          <p className="eyebrow">ALBUM</p>
          <h1 id="album-title">{selectedAlbum.albumTitle || 'Album'}</h1>
          {selectedAlbum.author && <p className="album-author">{selectedAlbum.author}</p>}
          {!loading && !error && (
            <p className="album-meta">{collectionTracks.length} {collectionTracks.length === 1 ? 'track' : 'tracks'}{duration > 0 && ` · ${timeLabel(duration)}`}</p>
          )}
        </div>
      </section>
      <div className="content-sections album-content">
        <TrackLibrary library={library} player={player} libraryRef={libraryRef} />
      </div>
    </>
  )
}
