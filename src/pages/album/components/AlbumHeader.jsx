import Artwork from '../../../components/music/Artwork.jsx'
import { timeLabel } from '../../../lib/format.js'
import { trackDurationSeconds } from '../../../lib/tracks.js'

export default function AlbumHeader({ album, tracks }) {
  const duration = tracks.reduce((total, track) => total + (trackDurationSeconds(track) || 0), 0)
  return (
    <section className="album-hero" aria-labelledby="album-title">
      <div className="album-identity">
        <Artwork track={tracks[0] || album} />
        <div className="album-details">
          <p className="album-type">Album</p>
          <h1 id="album-title">{album.albumTitle || 'Album'}</h1>
          <p className="album-meta">
            {album.author && <><span className="album-author">{album.author}</span><span aria-hidden="true"> · </span></>}
            <span>{tracks.length} {tracks.length === 1 ? 'song' : 'songs'}</span>
            {duration > 0 && <><span aria-hidden="true">, </span><span className="album-total-duration">{timeLabel(duration)}</span></>}
          </p>
        </div>
      </div>
    </section>
  )
}
