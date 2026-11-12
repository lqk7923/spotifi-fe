import { CircleAlert, LoaderCircle } from 'lucide-react'
import { albumPath, likedSongsPath } from '../../app/routing/navigation.js'
import TrackLibrary from '../../features/library/components/TrackLibrary.jsx'
import AlbumHeader from './components/AlbumHeader.jsx'
import AlbumActions from './components/AlbumActions.jsx'
import MainContent from '../../layouts/music/main-content/MainContent.jsx'
import useBannerColor from '../../components/music/useBannerColor.js'

function AlbumContent({ library, player, libraryRef }) {
  const { selectedAlbum, collectionTracks, likedOnly, loading, error, albumNotFound, requiresLogin } = library

  if (loading && !likedOnly) {
    return (
      <div className="album-loading-state" role="status">
        <LoaderCircle className="spin" size={40} strokeWidth={2} aria-hidden="true" />
        <span className="sr-only">Loading album…</span>
      </div>
    )
  }

  if (albumNotFound) {
    return (
      <section className="album-not-found" aria-labelledby="album-not-found-title" role="status">
        <CircleAlert size={72} strokeWidth={2} aria-hidden="true" />
        <h1 id="album-not-found-title">Could not find that album</h1>
        <p>Try searching for another song?</p>
      </section>
    )
  }

  const showHeader = likedOnly || (!error && !requiresLogin)
  const LoginHeading = likedOnly ? 'h2' : 'h1'
  return (
    <>
      {showHeader && <AlbumHeader album={selectedAlbum} tracks={collectionTracks} likedOnly={likedOnly}
        showTrackSummary={!loading && !error && !requiresLogin} />}
      {requiresLogin ? (
        <section className="album-not-found" role="status">
          <LoginHeading>{likedOnly ? 'Log in to view your liked songs' : 'Log in to view this album'}</LoginHeading>
          <p>{likedOnly ? 'Sign in to see the songs saved to your account.' : 'Sign in to see the full album and its tracks.'}</p>
          <button type="button" className="btn" onClick={library.requestCollectionLogin}>Log in</button>
        </section>
      ) : (
        <div className="content-sections album-content">
          <TrackLibrary library={library} player={player} libraryRef={libraryRef} header={<AlbumActions library={library} player={player} />} />
        </div>
      )}
    </>
  )
}

export default function AlbumPage({ albumId, library, player, libraryRef, mainRef }) {
  const { loading, error, albumNotFound, selectedAlbum, likedOnly } = library
  const albumColor = useBannerColor(selectedAlbum)
  const bannerColor = likedOnly ? 'var(--liked-songs-color)' : albumColor
  let className = 'album-page'
  if (!likedOnly) {
    if (loading) className = 'album-loading'
    else if (albumNotFound || error) className = 'album-unavailable'
  }
  return (
    <MainContent scrollRef={mainRef} resetKey={likedOnly ? likedSongsPath : albumPath(albumId)} className={className}
      style={{ '--album-color': bannerColor }} busy={loading}>
      <AlbumContent library={library} player={player} libraryRef={libraryRef} />
    </MainContent>
  )
}
