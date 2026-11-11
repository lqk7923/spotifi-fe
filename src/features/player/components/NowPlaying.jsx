import { Heart } from 'lucide-react'
import { trackAuthor, trackLabel } from '../../../lib/tracks.js'
import Artwork from '../../../components/music/Artwork.jsx'

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
      {liked && <Heart className="liked-track-icon" size={18} fill="currentColor" role="img" aria-label="Liked" />}
    </div>
  )
}
