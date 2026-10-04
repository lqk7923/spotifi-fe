import { useEffect, useRef, useState } from 'react'
import useAudioPlayer from '../hooks/useAudioPlayer.js'
import useMusicLibrary from '../hooks/useMusicLibrary.js'
import PlaybackQueue from './PlaybackQueue.jsx'
import PlayerBar from './PlayerBar.jsx'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import OverlayScrollbar from './OverlayScrollbar.jsx'
import SidebarResizer from './SidebarResizer.jsx'
import { artworkColors } from '../lib/artwork.js'
import { COLLAPSED_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH } from '../lib/sidebarSizing.js'

export default function MusicLayout({ albumId, page: Page }) {
  const library = useMusicLibrary(albumId)
  const albumLoading = !!albumId && library.loading
  const albumUnavailable = !!albumId && (library.albumNotFound || !!library.error)
  const albumColors = albumId ? artworkColors(library.selectedAlbum) : null
  const audioRef = useRef(null)
  const player = useAudioPlayer(library.collectionTracks, audioRef)
  const hasCurrentTrack = !!player.currentTrack
  const [queueCollapsed, setQueueCollapsed] = useState(false)
  const [homeBannerColor, setHomeBannerColor] = useState('#32297b')
  const [leftWidth, setLeftWidth] = useState(MIN_SIDEBAR_WIDTH)
  const [rightWidth, setRightWidth] = useState(MIN_SIDEBAR_WIDTH)
  const expandedLeftWidth = useRef(MIN_SIDEBAR_WIDTH)
  const sidebarCollapsed = leftWidth === COLLAPSED_SIDEBAR_WIDTH
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

  const resizeLeftSidebar = (width) => {
    if (width !== COLLAPSED_SIDEBAR_WIDTH) expandedLeftWidth.current = width
    setLeftWidth(width)
  }
  const collapseQueue = () => {
    setQueueCollapsed(true)
  }
  const expandQueue = () => {
    setQueueCollapsed(false)
  }
  const toggleQueue = () => {
    if (queueCollapsed) expandQueue()
    else collapseQueue()
  }

  return (
    <div
      className={`music-app${hasCurrentTrack ? '' : ' playback-idle'}${sidebarCollapsed ? ' sidebar-collapsed' : ''}${queueCollapsed ? ' queue-collapsed' : ''}`}
      style={{ '--sidebar-left-width': `${leftWidth}px`, '--sidebar-right-width': `${rightWidth}px` }}
      data-theme="dark"
    >
      <audio ref={audioRef} {...player.audioEvents} preload="metadata" hidden />
      <a className="skip-link" href="#all-tracks">Skip to tracks</a>
      <Topbar search={library.search} onSearchChange={library.setSearch} searchRef={searchRef} onHome={showHome} />
      <Sidebar
        library={library} onSearch={() => searchRef.current?.focus()} onLibrary={focusLibrary}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => resizeLeftSidebar(sidebarCollapsed ? expandedLeftWidth.current : COLLAPSED_SIDEBAR_WIDTH)}
      />
      <SidebarResizer side="left" width={leftWidth} onResize={resizeLeftSidebar} collapsible />
      <main
        className={`main-content${albumLoading ? ' album-loading' : albumUnavailable ? ' album-unavailable' : albumId ? ' album-page' : ' home-page'}`}
        style={albumColors ? { '--album-color': albumColors[0] } : { '--home-banner-color': homeBannerColor }}
        aria-busy={albumLoading}
      >
        {!albumId && (
          <div className="main-categories" role="group" aria-label="Music categories">
            {['All', 'Music', 'Podcasts'].map((category) => (
              <button
                key={category} type="button" className="category-button"
                aria-pressed={category === 'All'}
              >
                {category}
              </button>
            ))}
          </div>
        )}
        <div ref={mainRef} className="main-scroll" tabIndex={0} aria-label="Page content">
          <div className="main-page">
            <Page library={library} player={player} libraryRef={libraryRef} onLibrary={focusLibrary}
              onAlbumHover={(album) => setHomeBannerColor(artworkColors(album)[0])} />
          </div>
        </div>
        <OverlayScrollbar scrollRef={mainRef} />
      </main>
      {!queueCollapsed && <SidebarResizer side="right" width={rightWidth} onResize={setRightWidth} />}
      <PlaybackQueue
        tracks={library.collectionTracks} player={player} collapsed={queueCollapsed}
        onCollapse={collapseQueue} onExpand={expandQueue} onSearch={() => searchRef.current?.focus()}
      />
      {hasCurrentTrack && (
        <PlayerBar
          player={player} library={library}
          queueOpen={!queueCollapsed} onToggleQueue={toggleQueue}
        />
      )}
    </div>
  )
}
