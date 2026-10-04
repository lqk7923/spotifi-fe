import { Heart } from 'lucide-react'
import { trackAuthor, trackLabel } from '../../../lib/tracks.js'
import Artwork from '../../../components/music/Artwork.jsx'
import IconButton from '../../../components/ui/IconButton.jsx'

export default function NowPlaying({ player, library }) {
  const { currentTrack } = player
  const liked = library.isLiked(currentTrack)
  return (
    <div className="player-track">
      <Artwork track={currentTrack} small />
      <div>
        <strong>{currentTrack ? trackLabel(currentTrack) : 'Nothing playing yet'}</strong>
        <span>{currentTrack ? trackAuthor(currentTrack) : 'Choose a track to get started'}</span>
      </div>
      {currentTrack && (
        <IconButton
          icon={Heart} label={liked ? 'Unlike current track' : 'Like current track'}
          active={liked} aria-pressed={liked} onClick={() => library.toggleLike(currentTrack)}
        />
      )}
    </div>
  )
}
