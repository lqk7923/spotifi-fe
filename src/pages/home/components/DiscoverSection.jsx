import { useId, useState } from 'react'
import { trackAuthor, trackKey, trackLabel } from '../../../lib/tracks.js'
import Artwork from '../../../components/music/Artwork.jsx'
import TrackCarousel from '../../../components/music/TrackCarousel.jsx'
import TrackPlayButton from '../../../components/music/TrackPlayButton.jsx'
import TrackPlaybackIcon from '../../../components/music/TrackPlaybackIcon.jsx'

function DiscoverTrackCard({ track, player, selected }) {
  const tooltipId = useId()
  const [tooltipDismissed, setTooltipDismissed] = useState(false)
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

export default function DiscoverSection({ library, player, onLibrary }) {
  const { loading, error, visibleTracks } = library
  if (loading || error || !visibleTracks.length) return null
  const currentKey = player.currentTrack && trackKey(player.currentTrack)

  return (
    <section aria-labelledby="discover-title">
      <div className="section-heading">
        <div><h2 id="discover-title">Your music, on repeat</h2></div>
        <button className="text-button" onClick={onLibrary}>SEE ALL</button>
      </div>
      <TrackCarousel>
        {visibleTracks.slice(0, 5).map(track => (
          <DiscoverTrackCard key={trackKey(track)} track={track} player={player}
            selected={trackKey(track) === currentKey} />
        ))}
      </TrackCarousel>
    </section>
  )
}
