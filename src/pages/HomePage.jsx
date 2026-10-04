import { DiscoverSection, WelcomeSection } from '../components/TrackHighlights.jsx'
import TrackLibrary from '../components/TrackLibrary.jsx'

export default function HomePage({ library, player, libraryRef, onLibrary, onAlbumHover }) {
  return (
    <>
      <WelcomeSection library={library} onAlbumHover={onAlbumHover} />
      <div className="content-sections">
        <DiscoverSection library={library} player={player} onLibrary={onLibrary} />
        <TrackLibrary library={library} player={player} libraryRef={libraryRef} />
        <footer className="page-footer"><span>Music for every moment.</span><span>YOUR MUSIC. YOUR SPACE.</span></footer>
      </div>
    </>
  )
}
