import AppLink from '../../app/routing/AppLink.jsx'
import { albumPath } from '../../app/routing/navigation.js'
import Artwork from '../../components/music/Artwork.jsx'
import TrackCard from '../../components/music/TrackCard.jsx'
import PlaybackError from '../../features/player/components/PlaybackError.jsx'
import MainContent from '../../layouts/music/main-content/MainContent.jsx'

export default function SearchPage({ search, player, library, mainRef }) {
  const { term, tracks, albums, loading, error, refresh } = search
  return (
    <MainContent scrollRef={mainRef} resetKey={term} busy={loading}>
      <div className="content-sections search-content">
        <h1>Search</h1>
        <PlaybackError player={player} />
        {tracks.length > 0 && (
          <section aria-labelledby="search-songs-title">
            <div className="section-heading"><h2 id="search-songs-title">Songs</h2></div>
            <div className="search-grid">
              {tracks.map(track => <TrackCard key={track.trackId} track={track} player={player} library={library} />)}
            </div>
          </section>
        )}
        {albums.length > 0 && (
          <section aria-labelledby="search-albums-title">
            <div className="section-heading"><h2 id="search-albums-title">Albums</h2></div>
            <div className="search-grid">
              {albums.map(album => (
                <AppLink key={album.albumId} className="card music-card" href={albumPath(album.albumId)}>
                  <Artwork track={album} />
                  <h3 title={album.title}>{album.title || 'Untitled album'}</h3>
                  {album.artist && <p title={album.artist}>{album.artist}</p>}
                </AppLink>
              ))}
            </div>
          </section>
        )}
        {term && loading && <p className="search-status" role="status">Searching…</p>}
        {term && error && (
          <div className="search-status">
            <p role="alert">{error}</p>
            <button type="button" className="btn retry-button" onClick={refresh}>Try again</button>
          </div>
        )}
        {term && !loading && !error && !tracks.length && !albums.length && (
          <p className="search-status" role="status">No results for “{term}”.</p>
        )}
      </div>
    </MainContent>
  )
}
