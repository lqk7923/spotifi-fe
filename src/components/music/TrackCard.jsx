import { useId, useState } from 'react'
import { trackAuthor, trackKey, trackLabel } from '../../lib/tracks.js'
import Artwork from './Artwork.jsx'
import TrackPlayButton from './TrackPlayButton.jsx'
import TrackPlaybackIcon from './TrackPlaybackIcon.jsx'

export default function TrackCard({ track, player }) {
  const tooltipId = useId()
  const [tooltipDismissed, setTooltipDismissed] = useState(false)
  const selected = !!player.currentTrack && trackKey(player.currentTrack) === trackKey(track)
  const action = selected && player.isPlaying ? 'Pause' : 'Play'

  return (
    <article className={`card music-card ${selected ? 'selected' : ''}`}>
      <TrackPlayButton track={track} player={player} className="artwork-button"
        aria-describedby={tooltipId} data-dismissed={tooltipDismissed}
        onFocus={() => setTooltipDismissed(false)}
        onKeyDown={event => { if (event.key === 'Escape') setTooltipDismissed(true) }}>
        <Artwork track={track} />
        <span className="card-play" onMouseEnter={() => setTooltipDismissed(false)}>
          <TrackPlaybackIcon selected={selected} player={player} size={21} />
          <span id={tooltipId} className="home-play-tooltip" role="tooltip">{action}</span>
        </span>
      </TrackPlayButton>
      <h3>{trackLabel(track)}</h3><p title={trackAuthor(track)}>{trackAuthor(track)}</p>
    </article>
  )
}
