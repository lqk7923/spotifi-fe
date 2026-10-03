import { useRef } from 'react'
import { Headphones, ListMusic, X } from 'lucide-react'
import { trackAuthor, trackKey, trackLabel } from '../lib/tracks.js'
import Artwork from './Artwork.jsx'
import IconButton from './IconButton.jsx'
import AppLink from './AppLink.jsx'
import { albumPath } from '../lib/navigation.js'
import OverlayScrollbar from './OverlayScrollbar.jsx'
import SidebarMediaItem from './SidebarMediaItem.jsx'

export default function PlaybackQueue({ tracks, library, player, open, onClose }) {
  const scrollRef = useRef(null)
  const currentKey = player.currentTrack && trackKey(player.currentTrack)
  const currentIndex = tracks.findIndex((track) => trackKey(track) === currentKey)
  const upcomingTracks = tracks.slice(currentIndex + 1)
  const albumPreview = library.selectedAlbum && !library.albumNotFound
    ? tracks[0] || library.tracks.find((track) => track.albumId === library.selectedAlbum.albumId)
    : null
  const cardTrack = player.currentTrack || albumPreview
  let status = 'Ready when you are'
  if (player.isLoading) status = 'Getting your track ready…'
  else if (player.isPlaying) status = 'Playing from your library'

  return (
    <aside className={`queue-panel ${open ? 'queue-open' : ''}`} aria-label="Playback queue">
      <IconButton icon={X} label="Close queue" className="close-queue" onClick={onClose} />
      <div className="queue-scroll" ref={scrollRef} tabIndex={0} aria-label="Queue content">
        <div className="queue-body">
          {player.currentTrack && (
            <div className="queue-current">
              <AppLink className="queue-album-cover" href={albumPath(cardTrack.albumId)} aria-label={`Open album ${cardTrack.albumTitle || 'Untitled album'}`}>
                <Artwork track={cardTrack} />
              </AppLink>
              <div className="queue-current-details">
                <h3 className="queue-label">{player.currentTrack ? 'NOW PLAYING' : 'ALBUM'}</h3>
                <strong>{player.currentTrack ? trackLabel(cardTrack) : cardTrack.albumTitle || 'Untitled album'}</strong>
                <p>{trackAuthor(cardTrack)}</p>
                {player.currentTrack && <span className="now-status">{status}</span>}
              </div>
            </div>
          )}
          <div className="queue-content">
            <div className="queue-heading">
              <h2>Your queue</h2>
              <ListMusic size={19} className="desktop-queue-icon" />
            </div>
            {!player.currentTrack && albumPreview && (
              <>
                <h3 className="queue-label">ALBUM</h3>
                <SidebarMediaItem
                  track={albumPreview}
                  title={albumPreview.albumTitle || 'Untitled album'}
                  subtitle={`Album • ${trackAuthor(albumPreview)}`}
                  href={albumPath(albumPreview.albumId)}
                />
              </>
            )}
            {!cardTrack && <p className="queue-caption">Keep the good music going.</p>}
            {!cardTrack && (
              <>
                <h3 className="queue-label">NOW PLAYING</h3>
                <div className="queue-empty">
                  <Headphones size={32} /><h3>Find your rhythm</h3><p>Choose a track. We’ll take it from here.</p>
                </div>
              </>
            )}
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
