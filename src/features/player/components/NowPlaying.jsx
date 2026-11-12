import { trackAuthor, trackLabel } from '../../../lib/tracks.js'
import Artwork from '../../../components/music/Artwork.jsx'
import TrackLikeButton from '../../../components/music/TrackLikeButton.jsx'

export default function NowPlaying({ player, library }) {
  const { currentTrack } = player
  return (
    <div className="player-track">
      <Artwork track={currentTrack} small />
      <div>
        <strong>{currentTrack ? trackLabel(currentTrack) : 'Nothing playing yet'}</strong>
        <span>{currentTrack ? trackAuthor(currentTrack) : 'Choose a track to get started'}</span>
      </div>
      {currentTrack && <TrackLikeButton track={currentTrack} library={library} />}
    </div>
  )
}
