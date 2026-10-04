import { AudioLines, Heart } from 'lucide-react'
import { timeLabel } from '../../lib/format.js'
import { trackAuthor, trackDurationSeconds, trackKey, trackLabel } from '../../lib/tracks.js'
import { albumPath } from '../../app/routing/navigation.js'
import AppLink from '../../app/routing/AppLink.jsx'
import Artwork from './Artwork.jsx'
import IconButton from '../ui/IconButton.jsx'
import TrackPlayButton from './TrackPlayButton.jsx'
import TrackPlaybackIcon from './TrackPlaybackIcon.jsx'

export default function TrackRow({ track, index, player, liked, onToggleLike, showAlbum }) {
  const selected = player.currentTrack && trackKey(track) === trackKey(player.currentTrack)
  const subtitle = trackAuthor(track)
  const duration = selected && player.duration > 0 ? player.duration : trackDurationSeconds(track)
  const title = <span><strong>{trackLabel(track)}</strong><small title={subtitle}>{subtitle}</small></span>

  return (
    <tr className={selected ? 'current-row' : ''}>
      <td>
        <TrackPlayButton track={track} player={player} className="row-play">
          <span className="row-number">
            {selected && player.isPlaying ? <AudioLines size={17} /> : index + 1}
          </span>
          <span className="row-play-icon"><TrackPlaybackIcon selected={selected} player={player} size={16} /></span>
        </TrackPlayButton>
      </td>
      <td>
        <TrackPlayButton track={track} player={player} className="track-title-cell">
          <Artwork track={track} small />
          {title}
        </TrackPlayButton>
        {showAlbum && (
          <AppLink className="album-link mobile-album-link" href={albumPath(track.albumId)}>
            {track.albumTitle || 'Untitled album'}
          </AppLink>
        )}
      </td>
      {showAlbum && (
        <td className="collection-column">
          <AppLink className="album-link" title={track.albumTitle} href={albumPath(track.albumId)}>
            {track.albumTitle || 'Untitled album'}
          </AppLink>
        </td>
      )}
      <td className="like-column">
        <IconButton
          icon={Heart} label={`${liked ? 'Unlike' : 'Like'} ${trackLabel(track)}`}
          active={liked} aria-pressed={liked} onClick={() => onToggleLike(track)}
        />
      </td>
      <td className="duration-column">{duration != null ? timeLabel(duration) : '—'}</td>
    </tr>
  )
}

