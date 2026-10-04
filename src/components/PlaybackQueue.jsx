import { useRef } from 'react'
import { ListMusic, PanelRightClose, X } from 'lucide-react'
import { trackAuthor, trackKey, trackLabel } from '../lib/tracks.js'
import Artwork from './Artwork.jsx'
import IconButton from './IconButton.jsx'
import AppLink from './AppLink.jsx'
import { albumPath } from '../lib/navigation.js'
import OverlayScrollbar from './OverlayScrollbar.jsx'
import SidebarMediaItem from './SidebarMediaItem.jsx'

export default function PlaybackQueue({ tracks, player, open, onClose, onSearch }) {
  const scrollRef = useRef(null)
  const currentKey = player.currentTrack && trackKey(player.currentTrack)
  const currentIndex = tracks.findIndex((track) => trackKey(track) === currentKey)
  const upcomingTracks = tracks.slice(currentIndex + 1)
  const cardTrack = player.currentTrack
  let status = 'Ready when you are'
  if (player.isLoading) status = 'Getting your track ready…'
  else if (player.isPlaying) status = 'Playing from your library'

  if (!cardTrack) {
    return (
      <aside className={`queue-panel queue-idle ${open ? 'queue-open' : ''}`} aria-label="Playback queue">
        <PanelRightClose className="queue-idle-icon" size={22} aria-hidden="true" />
        <IconButton icon={X} label="Close queue" className="close-queue" onClick={onClose} />
        <div className="queue-empty">
          <h2>Find something to play</h2>
          <button className="queue-search" onClick={onSearch} aria-label="Search for music">Search</button>
        </div>
      </aside>
    )
  }

  return (
    <aside className={`queue-panel ${open ? 'queue-open' : ''}`} aria-label="Playback queue">
      <IconButton icon={X} label="Close queue" className="close-queue" onClick={onClose} />
      <div className="queue-scroll" ref={scrollRef} tabIndex={0} aria-label="Queue content">
        <div className="queue-body">
          <div className="queue-current">
            <AppLink className="queue-album-cover" href={albumPath(cardTrack.albumId)} aria-label={`Open album ${cardTrack.albumTitle || 'Untitled album'}`}>
              <Artwork track={cardTrack} />
            </AppLink>
            <div className="queue-current-details">
              <h3 className="queue-label">NOW PLAYING</h3>
              <strong>{trackLabel(cardTrack)}</strong>
              <p>{trackAuthor(cardTrack)}</p>
              <span className="now-status">{status}</span>
            </div>
          </div>
          <div className="queue-content">
            <div className="queue-heading">
              <h2>Your queue</h2>
              <ListMusic size={19} className="desktop-queue-icon" />
            </div>
            {upcomingTracks.length > 0 && (
              <>
                <h3 className="queue-label">NEXT UP <span>{upcomingTracks.length}</span></h3>
                <div className="queue-list">
                  {upcomingTracks.slice(0, 8).map((track) => (
                    <SidebarMediaItem
                      key={trackKey(track)} className="queue-track"
                      track={track} title={trackLabel(track)} subtitle={trackAuthor(track)}
                      label={`Play ${trackLabel(track)}`}
                      onClick={() => { void player.selectTrack(track) }}
                    />
                  ))}
                </div>
              </>
            )}
            {player.shuffle && <p className="queue-note">Shuffle is on. Your next track will be a surprise.</p>}
          </div>
        </div>
      </div>
      <OverlayScrollbar scrollRef={scrollRef} label="Scroll queue" />
    </aside>
  )
}
