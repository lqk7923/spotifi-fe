import { CircleAlert } from 'lucide-react'
import TrackLibrary from '../../features/library/components/TrackLibrary.jsx'
import AlbumHeader from './components/AlbumHeader.jsx'
import AlbumActions from './components/AlbumActions.jsx'
import MainContent from '../../layouts/music/main-content/MainContent.jsx'
import { artworkColors } from '../../lib/artwork.js'

function AlbumContent({ library, player, libraryRef }) {
  const { selectedAlbum, collectionTracks, loading, error, albumNotFound } = library

  if (loading) {
    return <p className="sr-only" role="status">Loading album…</p>
  }

  if (albumNotFound) {
    return (
      <section className="album-not-found" aria-labelledby="album-not-found-title" role="status">
        <CircleAlert size={72} strokeWidth={2} aria-hidden="true" />
        <h1 id="album-not-found-title">Could not find that album</h1>
        <p>Search for something else?</p>
      </section>
    )
  }

  if (error) {
    return (
      <div className="content-sections album-content">
        <TrackLibrary library={library} player={player} libraryRef={libraryRef} header={<AlbumActions library={library} player={player} />} />
      </div>
    )
  }

  return (
    <>
      <AlbumHeader album={selectedAlbum} tracks={collectionTracks} />
      <div className="content-sections album-content">
        <TrackLibrary library={library} player={player} libraryRef={libraryRef} header={<AlbumActions library={library} player={player} />} />
      </div>
    </>
  )
}

export default function AlbumPage({ albumId, library, player, libraryRef, mainRef }) {
  const { loading, error, albumNotFound, selectedAlbum } = library
  const className = loading ? 'album-loading' : albumNotFound || error ? 'album-unavailable' : 'album-page'
  return (
    <MainContent scrollRef={mainRef} resetKey={albumId} className={className}
      style={{ '--album-color': artworkColors(selectedAlbum)[0] }} busy={loading}>
      <AlbumContent library={library} player={player} libraryRef={libraryRef} />
    </MainContent>
  )
}
