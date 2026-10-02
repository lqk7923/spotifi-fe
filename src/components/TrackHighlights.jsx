import { AudioLines } from 'lucide-react'
import { greetingLabel } from '../lib/format.js'
import { trackAuthor, trackKey, trackLabel } from '../lib/tracks.js'
import Artwork from './Artwork.jsx'
import TrackPlayButton, { TrackPlaybackIcon } from './TrackPlayButton.jsx'

export function WelcomeSection({ library, player }) {
  const { loading, error, visibleTracks } = library
  const currentKey = player.currentTrack && trackKey(player.currentTrack)
  let content = <p className="welcome-copy">A little music. A better day. Find your next track below.</p>

  if (loading) {
    content = (
      <div className="quick-grid" aria-label="Loading tracks">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="skeleton quick-skeleton" />)}
      </div>
    )
  } else if (!error && visibleTracks.length) {
    content = (
      <div className="quick-grid">
        {visibleTracks.slice(0, 6).map((track) => {
          const selected = trackKey(track) === currentKey
          return (
            <TrackPlayButton
              key={trackKey(track)} track={track} player={player}
              className={`quick-track ${selected ? 'selected' : ''}`}
            >
              <Artwork track={track} small />
              <span>{trackLabel(track)}</span>
              <span className="quick-play"><TrackPlaybackIcon selected={selected} player={player} /></span>
            </TrackPlayButton>
          )
        })}
      </div>
    )
  }

  return (
    <section className="welcome-section" aria-labelledby="welcome-title">
      <div className="welcome-heading">
        <div><p className="eyebrow">YOUR DAILY SOUNDTRACK</p><h1 id="welcome-title">{greetingLabel()}</h1></div>
        <span className="badge music-badge"><AudioLines size={13} />Let the music play</span>
      </div>
      {content}
    </section>
  )
}

export function DiscoverSection({ library, player, onLibrary }) {
  const { loading, error, visibleTracks } = library
  if (loading || error || !visibleTracks.length) return null
  const currentKey = player.currentTrack && trackKey(player.currentTrack)

  return (
    <section aria-labelledby="discover-title">
      <div className="section-heading">
        <div><h2 id="discover-title">Your music, on repeat</h2><p>Pick a track and make it your moment.</p></div>
        <button className="text-button" onClick={onLibrary}>SEE ALL</button>
      </div>
      <div className="track-grid">
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
      </div>
    </section>
  )
}
