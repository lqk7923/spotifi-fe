import { Clock3 } from 'lucide-react'
import { trackKey } from '../../lib/tracks.js'
import TrackRow from './TrackRow.jsx'

export default function TrackTable({ tracks, player, isLiked, onToggleLike, showAlbum = true }) {
  return (
    <div className="track-table-wrap">
      <table className="table track-table">
        <thead>
          <tr>
            <th className="number-column">#</th><th>Title</th>
            {showAlbum && <th className="collection-column">Album</th>}
            <th className="like-column"><span className="sr-only">Favorite</span></th>
            <th className="duration-column"><Clock3 size={16} aria-label="Duration" /></th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track, index) => (
            <TrackRow key={trackKey(track)} track={track} index={index} player={player} liked={isLiked(track)} onToggleLike={onToggleLike} showAlbum={showAlbum} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

