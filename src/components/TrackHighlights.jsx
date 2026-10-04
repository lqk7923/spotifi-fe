import { AudioLines } from 'lucide-react'
import { greetingLabel } from '../lib/format.js'
import { albumPath } from '../lib/navigation.js'
import { getAlbums, trackAuthor, trackKey, trackLabel } from '../lib/tracks.js'
import AppLink from './AppLink.jsx'
import Artwork from './Artwork.jsx'
import TrackCarousel from './TrackCarousel.jsx'
import TrackPlayButton, { TrackPlaybackIcon } from './TrackPlayButton.jsx'

export function WelcomeSection({ library, onAlbumHover }) {
  const { loading, error, visibleTracks } = library
  const albums = getAlbums(visibleTracks).slice(0, 8)
  let content = <p className="welcome-copy">A little music. A better day. Find your next track below.</p>

  if (loading) {
    content = (
      <div className="quick-grid" aria-label="Loading albums">
        {Array.from({ length: 8 }, (_, index) => <div key={index} className="skeleton quick-skeleton" />)}
      </div>
    )
  } else if (!error && albums.length) {
    content = (
      <div className="quick-grid">
        {albums.map((album) => (
          <AppLink key={album.albumId} href={albumPath(album.albumId)} className="quick-track"
            onPointerEnter={() => onAlbumHover?.(album)} onFocus={() => onAlbumHover?.(album)}
            aria-label={`Open album ${album.albumTitle}`} title={album.albumTitle}>
            <Artwork track={album} small />
            <span>{album.albumTitle}</span>
          </AppLink>
        ))}
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
