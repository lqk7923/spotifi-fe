import { useId, useState } from 'react'
import { albumPath } from '../../../app/routing/navigation.js'
import AppLink from '../../../app/routing/AppLink.jsx'
import Artwork from '../../../components/music/Artwork.jsx'
import TrackPlaybackIcon from '../../../components/music/TrackPlaybackIcon.jsx'

export default function QuickAlbum({ album, tracks, player, onAlbumHover }) {
  const tooltipId = useId()
  const [tooltipDismissed, setTooltipDismissed] = useState(false)
  const selected = player.currentTrack?.albumId === album.albumId
  const action = selected && player.isPlaying ? 'Pause' : 'Play'
  const firstTrack = tracks.find(track => track.albumId === album.albumId)

  return (
    <div className="quick-album"
      onPointerEnter={() => onAlbumHover?.(album)} onFocus={() => onAlbumHover?.(album)}>
      <AppLink href={albumPath(album.albumId)} className="quick-track"
        aria-label={`Open album ${album.albumTitle}`} title={album.albumTitle}>
        <Artwork track={album} small />
        <span>{album.albumTitle}</span>
      </AppLink>
      <div className="quick-album-play-control" data-dismissed={tooltipDismissed}
        onMouseEnter={() => setTooltipDismissed(false)}
        onFocus={() => setTooltipDismissed(false)}
        onKeyDown={event => { if (event.key === 'Escape') setTooltipDismissed(true) }}>
        <button type="button" className="quick-album-play"
          aria-label={`${action} album ${album.albumTitle}`} aria-describedby={tooltipId}
          disabled={!firstTrack}
          onClick={() => { void (selected ? player.togglePlayback() : player.startTrack(firstTrack)) }}>
          <TrackPlaybackIcon selected={selected} player={player} size={22} />
        </button>
        <span id={tooltipId} className="home-play-tooltip" role="tooltip">{action}</span>
      </div>
    </div>
  )
}
