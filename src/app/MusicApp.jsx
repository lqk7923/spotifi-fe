import { useCallback, useRef, useState, useSyncExternalStore } from 'react'
import AuthenticatedPlayer from '../features/player/components/AuthenticatedPlayer.jsx'
import { createGuestPlayer } from '../features/player/lib/guest-player.js'
import ListenPrompt from '../features/auth/ListenPrompt.jsx'
import { auth } from '../services/keycloak.js'
import useMusicLibrary from '../features/library/hooks/useMusicLibrary.js'
import QueueSidebar from '../features/player/components/QueueSidebar.jsx'
import BottomBar from '../features/player/components/BottomBar.jsx'
import LibrarySidebar from '../features/library/components/LibrarySidebar.jsx'
import TopBar from '../layouts/music/top-bar/TopBar.jsx'
import MusicLayout from '../layouts/music/MusicLayout.jsx'
import useMusicLayout from '../layouts/music/useMusicLayout.js'
import { navigate } from './routing/navigation.js'

export default function MusicApp({ albumId, page: Page }) {
  const { status } = useSyncExternalStore(auth.subscribe, auth.getSnapshot)
  const authenticated = status === 'authenticated'
  const [listenPrompt, setListenPrompt] = useState(null)
  const [guestVolume, setGuestVolume] = useState(0.7)
  const [guestMuted, setGuestMuted] = useState(false)
  const requestLogin = useCallback(track => setListenPrompt({ track }), [])
  const musicLibrary = useMusicLibrary(albumId, requestLogin)
  const layout = useMusicLayout()
  const searchRef = useRef(null)
  const libraryRef = useRef(null)
  const mainRef = useRef(null)

  const library = {
    ...musicLibrary,
    resetFilters: () => { musicLibrary.resetFilters(); navigate('/') },
    showLiked: () => {
      if (!authenticated) { requestLogin(musicLibrary.collectionTracks[0]); return }
      musicLibrary.showLiked(); navigate('/')
    },
  }
  const focusLibrary = () => libraryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const focusSearch = () => searchRef.current?.focus()
  const showHome = () => {
    library.resetFilters()
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const renderPage = player => (
    <>
      <MusicLayout
        layout={layout}
        topBar={<TopBar search={library.search} onSearchChange={library.setSearch} searchRef={searchRef} onHome={showHome} />}
        leftSidebar={(
          <LibrarySidebar library={library} onSearch={focusSearch} onLibrary={focusLibrary}
            collapsed={layout.sidebarCollapsed} compact={layout.isMobile} onToggleCollapse={layout.toggleLibrary} />
        )}
        rightSidebar={(
          <QueueSidebar tracks={player.tracks} player={player} collapsed={layout.queueCollapsed}
            onCollapse={layout.collapseQueue} onExpand={layout.expandQueue} onSearch={focusSearch} />
        )}
        bottomBar={(
          <BottomBar player={player} library={library} queueOpen={!layout.queueCollapsed} onToggleQueue={layout.toggleQueue} />
        )}
      >
        <Page albumId={albumId} library={library} player={player} libraryRef={libraryRef} mainRef={mainRef} onLibrary={focusLibrary} />
      </MusicLayout>
      {listenPrompt && <ListenPrompt track={listenPrompt.track} onClose={() => setListenPrompt(null)} />}
    </>
  )

  return authenticated
    ? <AuthenticatedPlayer tracks={musicLibrary.collectionTracks} loading={musicLibrary.loading} error={musicLibrary.error}>{renderPage}</AuthenticatedPlayer>
    : renderPage({ ...createGuestPlayer(musicLibrary.collectionTracks, requestLogin),
      volume: guestVolume, setVolume: setGuestVolume, isMuted: guestMuted, setIsMuted: setGuestMuted })
}
