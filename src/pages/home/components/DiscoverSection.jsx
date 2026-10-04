import { trackAuthor, trackKey, trackLabel } from '../../../lib/tracks.js'
import Artwork from '../../../components/music/Artwork.jsx'
import TrackCarousel from '../../../components/music/TrackCarousel.jsx'
import TrackPlayButton from '../../../components/music/TrackPlayButton.jsx'
import TrackPlaybackIcon from '../../../components/music/TrackPlaybackIcon.jsx'

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
        {visibleTracks.slice(0, 5).map((track) => {
          const selected = trackKey(track) === currentKey
          return (
            <article key={trackKey(track)} className={`card music-card ${selected ? 'selected' : ''}`}>
              <TrackPlayButton track={track} player={player} className="artwork-button">
                <Artwork track={track} />
                <span className="card-play">
                  <TrackPlaybackIcon selected={selected} player={player} size={21} />
                </span>
              </TrackPlayButton>
              <h3>{trackLabel(track)}</h3><p title={trackAuthor(track)}>{trackAuthor(track)}</p>
            </article>
          )
        })}
      </TrackCarousel>
    </section>
  )
}
