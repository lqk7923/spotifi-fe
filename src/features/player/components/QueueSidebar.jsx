import { ChevronLeft, ListMusic, PanelRightClose } from 'lucide-react'
import { trackAuthor, trackKey, trackLabel } from '../../../lib/tracks.js'
import Artwork from '../../../components/music/Artwork.jsx'
import IconButton from '../../../components/ui/IconButton.jsx'
import AppLink from '../../../app/routing/AppLink.jsx'
import { albumPath } from '../../../app/routing/navigation.js'
import ScrollArea from '../../../components/ui/ScrollArea.jsx'
import SidebarPanel from '../../../layouts/music/sidebar/SidebarPanel.jsx'
import MediaListItem from '../../../components/music/MediaListItem.jsx'

export default function QueueSidebar({ tracks, player, collapsed, onCollapse, onExpand, onSearch }) {
  const currentKey = player.currentTrack && trackKey(player.currentTrack)
  const currentIndex = tracks.findIndex((track) => trackKey(track) === currentKey)
  const upcomingTracks = tracks.slice(currentIndex + 1)
  const cardTrack = player.currentTrack
  let status = 'Ready when you are'
  if (player.isLoading) status = 'Getting your track ready…'
  else if (player.isPlaying) status = ''

  return (
    <SidebarPanel
      side="right" collapseMode="rail" collapsed={collapsed}
      id="playback-queue"
      className={`queue-panel${cardTrack ? ' queue-has-track' : ' queue-idle'}${collapsed ? ' queue-collapsed' : ''}`}
      label="Playback queue"
      controls={!collapsed && (
        <IconButton
          icon={PanelRightClose} label="Collapse playback queue" className="queue-collapse-button"
          aria-expanded onClick={onCollapse}
        />
      )}
      collapsedContent={(
        <button className="queue-expand-button" type="button" aria-label="Expand playback queue" aria-expanded={false} onClick={onExpand}>
          <ChevronLeft size={26} aria-hidden="true" />
        </button>
      )}
    >
      {!cardTrack ? (
        <div className="queue-empty">
          <h2>Find something to play</h2>
          <button className="queue-search" onClick={onSearch} aria-label="Search for music">Search</button>
        </div>
      ) : (
        <ScrollArea className="queue-scroll" contentClassName="queue-body" label="Queue content" scrollbarLabel="Scroll queue">
          <div className="queue-current">
            <AppLink className="queue-album-cover" href={albumPath(cardTrack.albumId)} aria-label={`Open album ${cardTrack.albumTitle || 'Untitled album'}`}>
              <Artwork track={cardTrack} />
              <h3 className="queue-album-title">{cardTrack.albumTitle || trackLabel(cardTrack)}</h3>
            </AppLink>
            <div className="queue-current-details">
              <strong>{trackLabel(cardTrack)}</strong>
              <p>{trackAuthor(cardTrack)}</p>
              {status && <span className="now-status">{status}</span>}
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
                    <MediaListItem
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
        </ScrollArea>
      )}
    </SidebarPanel>
  )
}
