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
import useMusicSearch from '../pages/search/useMusicSearch.js'
import { likedSongsPath, navigate, searchPath } from './routing/navigation.js'

export default function MusicApp({ route, page: Page }) {
  const { albumId, query = '' } = route
  const isSearch = route.page === 'search'
  const session = useSyncExternalStore(auth.subscribe, auth.getSnapshot)
  const { status, user } = session
  const authenticated = status === 'authenticated'
  const [listenPrompt, setListenPrompt] = useState(null)
  const [guestVolume, setGuestVolume] = useState(0.7)
  const [guestMuted, setGuestMuted] = useState(false)
  const requestLogin = useCallback(track => setListenPrompt({ track }), [])
  const musicLibrary = useMusicLibrary(route, session, requestLogin)
  const search = useMusicSearch(query, user, musicLibrary.catalog, musicLibrary.albums)
  const layout = useMusicLayout()
  const searchRef = useRef(null)
  const libraryRef = useRef(null)
  const mainRef = useRef(null)

  const library = {
    ...musicLibrary,
    showAll: () => navigate('/'),
    showLiked: () => {
      if (!authenticated) { requestLogin(musicLibrary.collectionTracks[0]); return }
      navigate(likedSongsPath)
    },
  }
  const focusLibrary = () => libraryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const focusSearch = () => {
    if (!isSearch) navigate(searchPath())
    searchRef.current?.focus()
  }
  const showHome = () => {
    library.showAll()
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const renderPage = player => (
    <>
      <MusicLayout
        layout={layout}
        topBar={<TopBar search={query} onSearchChange={value => navigate(searchPath(value), { replace: isSearch })}
          searchRef={searchRef} onHome={showHome} />}
        leftSidebar={(
          <LibrarySidebar library={library} onSearch={focusSearch}
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
        <Page albumId={albumId} library={library} player={player} libraryRef={libraryRef}
          mainRef={mainRef} onLibrary={focusLibrary} search={search} />
      </MusicLayout>
      {listenPrompt && <ListenPrompt track={listenPrompt.track} onClose={() => setListenPrompt(null)} />}
    </>
  )

  const tracks = isSearch ? search.tracks : musicLibrary.collectionTracks
  const loading = isSearch ? !tracks.length : musicLibrary.loading
  const error = isSearch ? search.songError : musicLibrary.error
  return authenticated
    ? <AuthenticatedPlayer tracks={tracks} loading={loading} error={error}>{renderPage}</AuthenticatedPlayer>
    : renderPage({ ...createGuestPlayer(tracks, requestLogin),
      volume: guestVolume, setVolume: setGuestVolume, isMuted: guestMuted, setIsMuted: setGuestMuted })
}
