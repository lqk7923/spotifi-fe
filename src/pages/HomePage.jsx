import { useRef, useState } from 'react'
import PlaybackQueue from '../components/PlaybackQueue.jsx'
import PlayerBar from '../components/PlayerBar.jsx'
import Sidebar from '../components/Sidebar.jsx'
import Topbar from '../components/Topbar.jsx'
import { DiscoverSection, WelcomeSection } from '../components/TrackHighlights.jsx'
import TrackLibrary from '../components/TrackLibrary.jsx'
import useAudioPlayer from '../hooks/useAudioPlayer.js'
import useMusicLibrary from '../hooks/useMusicLibrary.js'

export default function HomePage() {
  const library = useMusicLibrary()
  const audioRef = useRef(null)
  const player = useAudioPlayer(library.tracks, audioRef)
  const [queueOpen, setQueueOpen] = useState(false)
  const searchRef = useRef(null)
  const libraryRef = useRef(null)
  const mainRef = useRef(null)

  const focusLibrary = () => {
    libraryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const showHome = () => {
    library.resetFilters()
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="music-app" data-theme="dark">
      <a className="skip-link" href="#all-tracks">Skip to tracks</a>
      <Sidebar library={library} onHome={showHome} onSearch={() => searchRef.current?.focus()} onLibrary={focusLibrary} />
      <main ref={mainRef} className="main-content">
        <Topbar search={library.search} onSearchChange={library.setSearch} searchRef={searchRef} />
        <WelcomeSection library={library} player={player} />
        <div className="content-sections">
          <DiscoverSection library={library} player={player} onLibrary={focusLibrary} />
          <TrackLibrary library={library} player={player} libraryRef={libraryRef} />
          <footer className="page-footer"><span>Music for every moment.</span><span>YOUR MUSIC. YOUR SPACE.</span></footer>
        </div>
      </main>
      <PlaybackQueue tracks={library.tracks} player={player} open={queueOpen} onClose={() => setQueueOpen(false)} />
      <PlayerBar
        audioRef={audioRef} player={player} library={library}
        queueOpen={queueOpen} onToggleQueue={() => setQueueOpen((value) => !value)}
      />
    </div>
  )
}
