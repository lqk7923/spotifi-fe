import { CircleAlert, Play, RefreshCw } from 'lucide-react'
import IconButton from '../../../components/ui/IconButton.jsx'
import LibraryContent from './LibraryContent.jsx'

export default function TrackLibrary({ library, player, libraryRef, header }) {
  const { loading, error, visibleTracks, likedOnly, refresh } = library
  const title = likedOnly ? 'Liked Songs' : 'All tracks'
  const countLabel = `${visibleTracks.length} ${visibleTracks.length === 1 ? 'track' : 'tracks'} in your collection`

  return (
    <section id="all-tracks" ref={libraryRef} aria-labelledby="library-title" className="library-section">
      {header || <div className="section-heading library-heading">
        <div>
          <h2 id="library-title">{title}</h2>
          <p>{loading ? 'Finding your music…' : countLabel}</p>
        </div>
        <div className="library-actions">
          <button
            className="btn play-all" disabled={loading || !!error || !visibleTracks.length}
            onClick={() => { void player.startTrack(visibleTracks[0]) }}
          >
            <Play size={17} fill="currentColor" />Play all
          </button>
          <IconButton icon={RefreshCw} label="Refresh tracks" disabled={loading} onClick={refresh} />
        </div>
      </div>}
      {player.error && (
        <div className="playback-error alert" role="alert">
          <CircleAlert size={19} /><span>{player.error}</span>
          <button className="text-button" onClick={() => { void player.startTrack(player.currentTrack, player.position) }}>
            Retry
          </button>
        </div>
      )}
      <LibraryContent library={library} player={player} />
    </section>
  )
}
