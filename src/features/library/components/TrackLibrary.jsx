import { Play, RefreshCw } from 'lucide-react'
import IconButton from '../../../components/ui/IconButton.jsx'
import PlaybackError from '../../player/components/PlaybackError.jsx'
import LibraryContent from './LibraryContent.jsx'

export default function TrackLibrary({ library, player, libraryRef, header }) {
  const { loading, error, collectionTracks, likedOnly, refresh } = library
  const title = likedOnly ? 'Liked Songs' : 'All tracks'
  const Heading = likedOnly ? 'h1' : 'h2'
  const countLabel = `${collectionTracks.length} ${collectionTracks.length === 1 ? 'track' : 'tracks'} in your collection`

  return (
    <section id="all-tracks" ref={libraryRef} aria-labelledby="library-title" className="library-section">
      {header || <div className="section-heading library-heading">
        <div>
          <Heading id="library-title">{title}</Heading>
          {!error && <p>{loading ? 'Finding your music…' : countLabel}</p>}
        </div>
        <div className="library-actions">
          <button
            className="btn play-all" disabled={loading || !!error || !collectionTracks.length}
            onClick={() => { void player.startTrack(collectionTracks[0]) }}
          >
            <Play size={17} fill="currentColor" />Play all
          </button>
          <IconButton icon={RefreshCw} label="Refresh tracks" disabled={loading} onClick={refresh} />
        </div>
      </div>}
      <PlaybackError player={player} />
      <LibraryContent library={library} player={player} />
    </section>
  )
}
