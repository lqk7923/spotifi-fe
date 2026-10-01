import { useEffect, useRef, useState } from 'react'
import {
  AudioLines, CircleAlert, Clock3, Headphones, Heart, Home, Library,
  ListMusic, LoaderCircle, Music2, Pause, Play, RefreshCw, Repeat,
  Search, Shuffle, SkipBack, SkipForward, UserRound, Volume2, VolumeX, X,
} from 'lucide-react'
import useAudioPlayer from './hooks/useAudioPlayer'
import { errorMessage, getTracks, trackKey, trackLabel } from './lib/music-api'
import './App.css'

const palettes = [
  ['#6b3bbd', '#b098e8'], ['#0b716a', '#88d7b2'], ['#a84832', '#edba86'],
  ['#264b97', '#90b8db'], ['#982c65', '#e993b9'], ['#807227', '#d9d58c'],
]

function Artwork({ track, small = false }) {
  const hash = [...(track?.trackId || 'music')].reduce((sum, letter) => sum + letter.charCodeAt(0), 0)
  const colors = palettes[hash % palettes.length]
  return (
    <div className={`track-art ${small ? 'track-art-small' : ''}`} aria-hidden="true"
      style={{ '--cover-start': colors[0], '--cover-end': colors[1] }}>
      <span className="cover-label">SOUND<br />COLLECTION</span>
      <div className="vinyl"><span /></div>
      <AudioLines className="cover-wave" />
      <span className="cover-id">{track?.trackId.slice(0, 4).toUpperCase() || 'MUSIC'}</span>
    </div>
  )
}

function IconButton({ icon: Icon, label, active = false, className = '', ...props }) {
  return <button type="button" className={`icon-button ${active ? 'active' : ''} ${className}`}
    aria-label={label} title={label} {...props}><Icon size={18} aria-hidden="true" /></button>
}

function timeLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

function readLikes() {
  try {
    const saved = JSON.parse(localStorage.getItem('music-likes') || '[]')
    return Array.isArray(saved) ? saved.filter((key) => typeof key === 'string') : []
  } catch { return [] }
}

function HomePage() {
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [reload, setReload] = useState(0)
  const [search, setSearch] = useState('')
  const [bucket, setBucket] = useState('')
  const [likedOnly, setLikedOnly] = useState(false)
  const [likes, setLikes] = useState(readLikes)
  const [queueOpen, setQueueOpen] = useState(false)
  const searchRef = useRef(null)
  const libraryRef = useRef(null)
  const mainRef = useRef(null)
  const audioRef = useRef(null)
  const player = useAudioPlayer(tracks, audioRef)

  useEffect(() => {
    const controller = new AbortController()
    getTracks(controller.signal)
      .then(setTracks)
      .catch((cause) => {
        if (!controller.signal.aborted) setListError(errorMessage(cause, 'Could not load your music.'))
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])

  useEffect(() => {
    try { localStorage.setItem('music-likes', JSON.stringify(likes)) } catch { /* Storage is optional. */ }
  }, [likes])

  const refresh = () => {
    setLoading(true)
    setListError('')
    setReload((value) => value + 1)
  }
  const toggleLike = (track) => {
    const key = trackKey(track)
    setLikes((saved) => saved.includes(key) ? saved.filter((value) => value !== key) : [...saved, key])
  }
  const resetFilters = () => { setSearch(''); setBucket(''); setLikedOnly(false) }
  const buckets = [...new Set(tracks.map((track) => track.bucketName))]
  const visibleTracks = tracks.filter((track) =>
    (!bucket || track.bucketName === bucket) &&
    (!likedOnly || likes.includes(trackKey(track))) &&
    `${trackLabel(track)} ${track.trackId} ${track.bucketName}`.toLowerCase().includes(search.toLowerCase().trim()))
  const currentKey = player.currentTrack ? trackKey(player.currentTrack) : ''
  const currentIndex = tracks.findIndex((track) => trackKey(track) === currentKey)
  const upcomingTracks = tracks.slice(currentIndex + 1)
  const selected = (track) => trackKey(track) === currentKey
  const select = (track) => { void player.selectTrack(track) }
  const focusLibrary = () => libraryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()))
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const playIcon = player.isPlaying ? Pause : Play
  const currentLiked = currentKey && likes.includes(currentKey)

  return (
    <div className="music-app" data-theme="dark">
      <a className="skip-link" href="#all-tracks">Skip to tracks</a>
      <aside className="sidebar" aria-label="Main navigation">
        <a className="brand" href="/home" aria-label="Spotifi home">
          <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <circle cx="20" cy="20" r="20" fill="currentColor" />
            <path d="M9 15c8-3 17-2 23 2M11 21c7-2 14-1 19 2M13 27c5-1 10-1 15 2" stroke="#000" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span>Spotifi</span>
        </a>
        <nav className="nav-links">
          <button className={`nav-item ${!likedOnly && !bucket ? 'nav-active' : ''}`} onClick={() => { resetFilters(); mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}><Home size={23} />Home</button>
          <button className="nav-item" onClick={() => searchRef.current?.focus()}><Search size={23} />Search</button>
          <button className="nav-item" onClick={focusLibrary}><Library size={23} />Your Library</button>
        </nav>
        <div className="nav-collection">
          <button className="nav-item" onClick={() => { resetFilters(); focusLibrary() }}><span className="square-icon"><ListMusic size={19} /></span>All tracks</button>
          <button className={`nav-item ${likedOnly ? 'nav-active' : ''}`} onClick={() => { setLikedOnly((value) => !value); setBucket(''); focusLibrary() }}><span className="square-icon liked-square"><Heart size={16} fill="currentColor" /></span>Liked Songs<span className="nav-count">{tracks.filter((track) => likes.includes(trackKey(track))).length}</span></button>
        </div>
        <div className="sidebar-divider" />
        <div className="sidebar-library">
          <p className="eyebrow">YOUR COLLECTIONS</p>
          {buckets.map((name) => <button key={name} className={`bucket-link ${bucket === name ? 'active' : ''}`} onClick={() => { setBucket(name); setLikedOnly(false); focusLibrary() }}><Music2 size={15} /><span>{name}</span></button>)}
          {!buckets.length && <p className="sidebar-hint">Your music collections will appear here.</p>}
        </div>
        <div className="sidebar-bottom"><Headphones size={16} /><span>Made for listening.</span></div>
      </aside>

      <main ref={mainRef} className="main-content">
        <header className="topbar">
          <label className="search-field input">
            <Search size={19} aria-hidden="true" />
            <span className="sr-only">Search tracks</span>
            <input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your music" />
            {search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')}><X size={16} /></button>}
          </label>
          <div className="guest-profile"><span><UserRound size={17} /></span><span>Music lover</span></div>
        </header>

        <section className="welcome-section" aria-labelledby="welcome-title">
          <div className="welcome-heading"><div><p className="eyebrow">YOUR DAILY SOUNDTRACK</p><h1 id="welcome-title">{greeting}</h1></div><span className="badge music-badge"><AudioLines size={13} />Let the music play</span></div>
          {loading ? <div className="quick-grid" aria-label="Loading tracks">{Array.from({ length: 6 }, (_, index) => <div key={index} className="skeleton quick-skeleton" />)}</div>
            : !listError && visibleTracks.length > 0 ? <div className="quick-grid">{visibleTracks.slice(0, 6).map((track) => <button key={trackKey(track)} className={`quick-track ${selected(track) ? 'selected' : ''}`} onClick={() => select(track)} aria-label={`${selected(track) && player.isPlaying ? 'Pause' : 'Play'} ${trackLabel(track)}`}>
              <Artwork track={track} small /><span>{trackLabel(track)}</span><span className="quick-play">{selected(track) && player.isLoading ? <LoaderCircle className="spin" size={18} /> : selected(track) && player.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</span>
            </button>)}</div> : <p className="welcome-copy">A little music. A better day. Find your next track below.</p>}
        </section>

        <div className="content-sections">
          {!loading && !listError && visibleTracks.length > 0 && <section aria-labelledby="discover-title">
            <div className="section-heading"><div><h2 id="discover-title">Your music, on repeat</h2><p>Pick a track and make it your moment.</p></div><button className="text-button" onClick={focusLibrary}>SEE ALL</button></div>
            <div className="track-grid">{visibleTracks.slice(0, 5).map((track) => <article key={trackKey(track)} className={`card music-card ${selected(track) ? 'selected' : ''}`}>
              <button className="artwork-button" onClick={() => select(track)} aria-label={`${selected(track) && player.isPlaying ? 'Pause' : 'Play'} ${trackLabel(track)}`}><Artwork track={track} /><span className="card-play">{selected(track) && player.isLoading ? <LoaderCircle className="spin" size={21} /> : selected(track) && player.isPlaying ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}</span></button>
              <h3>{trackLabel(track)}</h3><p title={track.bucketName}>{track.bucketName}</p>
            </article>)}</div>
          </section>}

          <section id="all-tracks" ref={libraryRef} aria-labelledby="library-title" className="library-section">
            <div className="section-heading library-heading"><div><h2 id="library-title">{likedOnly ? 'Liked Songs' : bucket || 'All tracks'}</h2><p>{loading ? 'Finding your music…' : `${visibleTracks.length} ${visibleTracks.length === 1 ? 'track' : 'tracks'} in your collection`}</p></div><div className="library-actions"><button className="btn play-all" disabled={loading || !!listError || !visibleTracks.length} onClick={() => { void player.startTrack(visibleTracks[0]) }}><Play size={17} fill="currentColor" />Play all</button><IconButton icon={RefreshCw} label="Refresh tracks" disabled={loading} onClick={refresh} /></div></div>
            {player.error && <div className="playback-error alert" role="alert"><CircleAlert size={19} /><span>{player.error}</span><button className="text-button" onClick={() => { void player.startTrack(player.currentTrack, player.position) }}>Retry</button></div>}
            {loading ? <div className="track-loading" role="status"><LoaderCircle className="spin" size={23} /><p>Loading your tracks…</p></div>
              : listError ? <div className="state-panel"><span className="state-icon"><CircleAlert size={30} /></span><h3>Your music is taking a break</h3><p role="alert">{listError}</p><button className="btn retry-button" onClick={refresh}><RefreshCw size={16} />Try again</button></div>
              : !visibleTracks.length ? <div className="state-panel"><span className="state-icon"><Music2 size={32} /></span><h3>{tracks.length ? 'No matching tracks' : 'Your library starts here'}</h3><p>{tracks.length ? likedOnly ? 'Like a track using its heart button to save it here.' : 'Try another search or collection.' : 'Add some tracks to your music collection, then refresh to start listening.'}</p><button className="btn retry-button" onClick={tracks.length ? resetFilters : refresh}>{tracks.length ? 'Show all tracks' : 'Refresh library'}</button></div>
              : <div className="track-table-wrap"><table className="table track-table"><thead><tr><th className="number-column">#</th><th>Title</th><th className="collection-column">Collection</th><th className="like-column"><span className="sr-only">Favorite</span></th><th className="duration-column"><Clock3 size={16} aria-label="Duration" /></th></tr></thead><tbody>{visibleTracks.map((track, index) => <tr key={trackKey(track)} className={selected(track) ? 'current-row' : ''}>
                <td><button className="row-play" onClick={() => select(track)} aria-label={`${selected(track) && player.isPlaying ? 'Pause' : 'Play'} ${trackLabel(track)}`}><span className="row-number">{selected(track) && player.isPlaying ? <AudioLines size={17} /> : index + 1}</span><span className="row-play-icon">{selected(track) && player.isLoading ? <LoaderCircle className="spin" size={16} /> : selected(track) && player.isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</span></button></td>
                <td><button className="track-title-cell" onClick={() => select(track)} aria-label={`${selected(track) && player.isPlaying ? 'Pause' : 'Play'} ${trackLabel(track)}`}><Artwork track={track} small /><span><strong>{trackLabel(track)}</strong><small title={track.trackId}>{track.trackId}</small></span></button></td>
                <td className="collection-column"><span title={track.bucketName}>{track.bucketName}</span></td>
                <td className="like-column"><IconButton icon={Heart} label={`${likes.includes(trackKey(track)) ? 'Unlike' : 'Like'} ${trackLabel(track)}`} active={likes.includes(trackKey(track))} aria-pressed={likes.includes(trackKey(track))} onClick={() => toggleLike(track)} /></td>
                <td className="duration-column">{selected(track) && player.duration > 0 ? timeLabel(player.duration) : '—'}</td>
              </tr>)}</tbody></table></div>}
          </section>
          <footer className="page-footer"><span>Music for every moment.</span><span>YOUR MUSIC. YOUR SPACE.</span></footer>
        </div>
      </main>

      <aside className={`queue-panel ${queueOpen ? 'queue-open' : ''}`} aria-label="Playback queue">
        <div className="queue-heading"><h2>Your queue</h2><IconButton icon={X} label="Close queue" className="close-queue" onClick={() => setQueueOpen(false)} /><ListMusic size={19} className="desktop-queue-icon" /></div>
        <p className="queue-caption">Keep the good music going.</p>
        <h3 className="queue-label">NOW PLAYING</h3>
        {player.currentTrack ? <div className="queue-current"><Artwork track={player.currentTrack} /><strong>{trackLabel(player.currentTrack)}</strong><p>{player.currentTrack.bucketName}</p><span className="now-status">{player.isLoading ? 'Getting your track ready…' : player.isPlaying ? 'Playing from your library' : 'Ready when you are'}</span></div> : <div className="queue-empty"><Headphones size={32} /><h3>Find your rhythm</h3><p>Choose a track. We’ll take it from here.</p></div>}
        {upcomingTracks.length > 0 && <><h3 className="queue-label">NEXT UP <span>{upcomingTracks.length}</span></h3><div className="queue-list">{upcomingTracks.slice(0, 8).map((track) => <button key={trackKey(track)} className="queue-track" onClick={() => select(track)} aria-label={`Play ${trackLabel(track)}`}><Artwork track={track} small /><span><strong>{trackLabel(track)}</strong><small>{track.bucketName}</small></span><Play size={14} /></button>)}</div></>}
        {player.shuffle && <p className="queue-note">Shuffle is on. Your next track will be a surprise.</p>}
      </aside>

      <footer className="player-bar" aria-label="Music player">
        <audio ref={audioRef} {...player.audioEvents} preload="metadata" />
        <div className="player-track"><Artwork track={player.currentTrack} small /><div><strong>{player.currentTrack ? trackLabel(player.currentTrack) : 'Nothing playing yet'}</strong><span>{player.currentTrack?.bucketName || 'Choose a track to get started'}</span></div>{player.currentTrack && <IconButton icon={Heart} label={currentLiked ? 'Unlike current track' : 'Like current track'} active={!!currentLiked} aria-pressed={!!currentLiked} onClick={() => toggleLike(player.currentTrack)} />}</div>
        <div className="player-center"><div className="playback-controls"><IconButton icon={Shuffle} label="Shuffle" active={player.shuffle} aria-pressed={player.shuffle} disabled={!tracks.length} onClick={() => player.setShuffle((value) => !value)} /><IconButton icon={SkipBack} label="Previous track" disabled={!tracks.length} onClick={() => { void player.skip(-1) }} /><IconButton icon={player.isLoading ? LoaderCircle : playIcon} label={player.isLoading ? 'Cancel loading' : player.isPlaying ? 'Pause playback' : 'Start playback'} className={`main-play ${player.isLoading ? 'spin-icon' : ''}`} disabled={!tracks.length && !player.currentTrack} onClick={() => { void player.togglePlayback() }} /><IconButton icon={SkipForward} label="Next track" disabled={!tracks.length} onClick={() => { void player.skip(1) }} /><IconButton icon={Repeat} label="Repeat track" active={player.repeat} aria-pressed={player.repeat} disabled={!tracks.length} onClick={() => player.setRepeat((value) => !value)} /></div><div className="progress-controls"><span>{timeLabel(player.position)}</span><input type="range" aria-label="Seek playback" min="0" max={player.duration || 1} step="0.1" value={Math.min(player.position, player.duration || 1)} disabled={!player.duration || player.isLoading} onChange={(event) => player.seek(event.target.value)} style={{ '--progress': `${player.duration ? player.position / player.duration * 100 : 0}%` }} /><span>{timeLabel(player.duration)}</span></div></div>
        <div className="player-extras"><IconButton icon={ListMusic} label="Toggle queue" active={queueOpen} aria-pressed={queueOpen} onClick={() => setQueueOpen((value) => !value)} /><IconButton icon={player.isMuted || player.volume === 0 ? VolumeX : Volume2} label={player.isMuted ? 'Unmute' : 'Mute'} aria-pressed={player.isMuted} onClick={() => player.setIsMuted((value) => !value)} /><input type="range" aria-label="Volume" min="0" max="1" step="0.01" value={player.isMuted ? 0 : player.volume} onChange={(event) => { player.setVolume(Number(event.target.value)); player.setIsMuted(false) }} style={{ '--progress': `${player.isMuted ? 0 : player.volume * 100}%` }} /></div>
      </footer>
    </div>
  )
}

export default function App() {
  if (window.location.pathname !== '/home' && window.location.pathname !== '/home/') {
    return <main className="not-found"><Music2 size={42} /><h1>Page not found</h1><a className="btn retry-button" href="/home">Back to your music</a></main>
  }
  return <HomePage />
}
