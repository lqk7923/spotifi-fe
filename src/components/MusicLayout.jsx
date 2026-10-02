import { useEffect, useRef, useState } from 'react'
import AlbumPage from '../pages/AlbumPage.jsx'
import HomePage from '../pages/HomePage.jsx'
import useAudioPlayer from '../hooks/useAudioPlayer.js'
import useMusicLibrary from '../hooks/useMusicLibrary.js'
import PlaybackQueue from './PlaybackQueue.jsx'
import PlayerBar from './PlayerBar.jsx'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

export default function MusicLayout({ albumId }) {
  const library = useMusicLibrary(albumId)
  const audioRef = useRef(null)
  const player = useAudioPlayer(library.collectionTracks, audioRef)
  const [queueOpen, setQueueOpen] = useState(false)
  const searchRef = useRef(null)
  const libraryRef = useRef(null)
  const mainRef = useRef(null)

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [albumId])

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
        {albumId
          ? <AlbumPage library={library} player={player} libraryRef={libraryRef} />
          : <HomePage library={library} player={player} libraryRef={libraryRef} onLibrary={focusLibrary} />}
      </main>
      <PlaybackQueue tracks={library.collectionTracks} player={player} open={queueOpen} onClose={() => setQueueOpen(false)} />
      <PlayerBar
        audioRef={audioRef} player={player} library={library}
        queueOpen={queueOpen} onToggleQueue={() => setQueueOpen((value) => !value)}
      />
    </div>
  )
}
