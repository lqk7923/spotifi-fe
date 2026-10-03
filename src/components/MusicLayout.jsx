import { useEffect, useRef, useState } from 'react'
import useAudioPlayer from '../hooks/useAudioPlayer.js'
import useMusicLibrary from '../hooks/useMusicLibrary.js'
import PlaybackQueue from './PlaybackQueue.jsx'
import PlayerBar from './PlayerBar.jsx'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import OverlayScrollbar from './OverlayScrollbar.jsx'
import { artworkColors } from '../lib/artwork.js'

export default function MusicLayout({ albumId, page: Page }) {
  const library = useMusicLibrary(albumId)
  const albumLoading = !!albumId && library.loading
  const albumColors = albumId ? artworkColors(library.collectionTracks[0]) : null
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
      <Topbar search={library.search} onSearchChange={library.setSearch} searchRef={searchRef} onHome={showHome} />
      <Sidebar library={library} onHome={showHome} onSearch={() => searchRef.current?.focus()} onLibrary={focusLibrary} />
      <main
        className={`main-content${albumLoading ? ' album-loading' : library.albumNotFound ? ' album-unavailable' : albumId ? ' album-page' : ''}`}
        style={albumColors ? { '--album-color': albumColors[0] } : undefined}
        aria-busy={albumLoading}
      >
        <div ref={mainRef} className="main-scroll" tabIndex={0} aria-label="Page content">
          <div className="main-page">
            <Page library={library} player={player} libraryRef={libraryRef} onLibrary={focusLibrary} />
          </div>
        </div>
        <OverlayScrollbar scrollRef={mainRef} />
      </main>
      <PlaybackQueue tracks={library.collectionTracks} library={library} player={player} open={queueOpen} onClose={() => setQueueOpen(false)} />
      <PlayerBar
        audioRef={audioRef} player={player} library={library}
        queueOpen={queueOpen} onToggleQueue={() => setQueueOpen((value) => !value)}
      />
    </div>
  )
}
