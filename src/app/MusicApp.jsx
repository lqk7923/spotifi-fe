import { useRef } from 'react'
import useAudioPlayer from '../features/player/hooks/useAudioPlayer.js'
import useMusicLibrary from '../features/library/hooks/useMusicLibrary.js'
import QueueSidebar from '../features/player/components/QueueSidebar.jsx'
import BottomBar from '../features/player/components/BottomBar.jsx'
import LibrarySidebar from '../features/library/components/LibrarySidebar.jsx'
import TopBar from '../layouts/music/top-bar/TopBar.jsx'
import MusicLayout from '../layouts/music/MusicLayout.jsx'
import useMusicLayout from '../layouts/music/useMusicLayout.js'
import { navigate } from './routing/navigation.js'

export default function MusicApp({ albumId, page: Page }) {
  const musicLibrary = useMusicLibrary(albumId)
  const audioRef = useRef(null)
  const player = useAudioPlayer(musicLibrary.collectionTracks, audioRef)
  const layout = useMusicLayout()
  const searchRef = useRef(null)
  const libraryRef = useRef(null)
  const mainRef = useRef(null)

  const library = {
    ...musicLibrary,
    resetFilters: () => { musicLibrary.resetFilters(); navigate('/') },
    showLiked: () => { musicLibrary.showLiked(); navigate('/') },
  }
  const focusLibrary = () => libraryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const focusSearch = () => searchRef.current?.focus()
  const showHome = () => {
    library.resetFilters()
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <audio ref={audioRef} {...player.audioEvents} preload="metadata" hidden />
      <MusicLayout
        layout={layout}
        hasCurrentTrack={!!player.currentTrack}
        topBar={<TopBar search={library.search} onSearchChange={library.setSearch} searchRef={searchRef} onHome={showHome} />}
        leftSidebar={(
          <LibrarySidebar library={library} onSearch={focusSearch} onLibrary={focusLibrary}
            collapsed={layout.sidebarCollapsed} compact={layout.isMobile} onToggleCollapse={layout.toggleLibrary} />
        )}
        rightSidebar={(
          <QueueSidebar tracks={library.collectionTracks} player={player} collapsed={layout.queueCollapsed}
            onCollapse={layout.collapseQueue} onExpand={layout.expandQueue} onSearch={focusSearch} />
        )}
        bottomBar={player.currentTrack && (
          <BottomBar player={player} library={library} queueOpen={!layout.queueCollapsed} onToggleQueue={layout.toggleQueue} />
        )}
      >
        <Page albumId={albumId} library={library} player={player} libraryRef={libraryRef} mainRef={mainRef} onLibrary={focusLibrary} />
      </MusicLayout>
    </>
  )
}
