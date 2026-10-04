import { AudioLines } from 'lucide-react'
import { greetingLabel } from '../../../lib/format.js'
import { albumPath } from '../../../app/routing/navigation.js'
import { getAlbums } from '../../../lib/tracks.js'
import AppLink from '../../../app/routing/AppLink.jsx'
import Artwork from '../../../components/music/Artwork.jsx'

export default function WelcomeSection({ library, onAlbumHover }) {
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

