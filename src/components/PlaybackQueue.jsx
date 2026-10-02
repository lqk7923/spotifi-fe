import { Headphones, ListMusic, Play, X } from 'lucide-react'
import { trackAuthor, trackKey, trackLabel } from '../lib/tracks.js'
import Artwork from './Artwork.jsx'
import IconButton from './IconButton.jsx'

export default function PlaybackQueue({ tracks, player, open, onClose }) {
  const currentKey = player.currentTrack && trackKey(player.currentTrack)
  const currentIndex = tracks.findIndex((track) => trackKey(track) === currentKey)
  const upcomingTracks = tracks.slice(currentIndex + 1)
  let status = 'Ready when you are'
  if (player.isLoading) status = 'Getting your track ready…'
  else if (player.isPlaying) status = 'Playing from your library'

  return (
    <aside className={`queue-panel ${open ? 'queue-open' : ''}`} aria-label="Playback queue">
      <div className="queue-heading">
        <h2>Your queue</h2>
        <IconButton icon={X} label="Close queue" className="close-queue" onClick={onClose} />
        <ListMusic size={19} className="desktop-queue-icon" />
      </div>
      <p className="queue-caption">Keep the good music going.</p>
      <h3 className="queue-label">NOW PLAYING</h3>
      {player.currentTrack ? (
        <div className="queue-current">
          <Artwork track={player.currentTrack} />
          <strong>{trackLabel(player.currentTrack)}</strong><p>{trackAuthor(player.currentTrack)}</p>
          <span className="now-status">{status}</span>
        </div>
      ) : (
        <div className="queue-empty">
          <Headphones size={32} /><h3>Find your rhythm</h3><p>Choose a track. We’ll take it from here.</p>
        </div>
      )}
      {upcomingTracks.length > 0 && (
        <>
          <h3 className="queue-label">NEXT UP <span>{upcomingTracks.length}</span></h3>
          <div className="queue-list">
            {upcomingTracks.slice(0, 8).map((track) => (
              <button
                key={trackKey(track)} className="queue-track" aria-label={`Play ${trackLabel(track)}`}
                onClick={() => { void player.selectTrack(track) }}
              >
                <Artwork track={track} small />
                <span><strong>{trackLabel(track)}</strong><small>{trackAuthor(track)}</small></span>
                <Play size={14} />
              </button>
            ))}
          </div>
        </>
      )}
      {player.shuffle && <p className="queue-note">Shuffle is on. Your next track will be a surprise.</p>}
    </aside>
  )
}
