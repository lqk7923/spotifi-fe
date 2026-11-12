import { RefreshCw, Shuffle } from 'lucide-react'
import { trackKey } from '../../../lib/tracks.js'
import IconButton from '../../../components/ui/IconButton.jsx'
import TrackPlaybackIcon from '../../../components/music/TrackPlaybackIcon.jsx'

export default function AlbumActions({ library, player }) {
  const { loading, error, collectionTracks, selectedAlbum, likedOnly, refresh, refreshDisabled } = library
  const collectionLabel = likedOnly ? 'Liked Songs' : `album ${selectedAlbum?.title || 'Album'}`
  const trackSelected = player.currentTrack && collectionTracks.some(
    (track) => trackKey(track) === trackKey(player.currentTrack),
  )
  const collectionPlaying = trackSelected && player.isPlaying

  return (
    <div className="album-actions">
      <h2 id="library-title" className="sr-only">Tracks</h2>
      <button
        type="button" className="album-play"
        aria-label={`${collectionPlaying ? 'Pause' : 'Play'} ${collectionLabel}`}
        disabled={loading || !!error || !collectionTracks.length}
        onClick={() => {
          void (trackSelected ? player.togglePlayback() : player.startTrack(collectionTracks[0]))
        }}
      >
        <TrackPlaybackIcon selected={trackSelected} player={player} size={24} />
      </button>
      <IconButton
        icon={Shuffle} label={likedOnly ? 'Shuffle Liked Songs' : 'Shuffle album'} active={player.shuffle} aria-pressed={player.shuffle}
        disabled={loading || !!error || !collectionTracks.length}
        onClick={() => player.setShuffle((value) => !value)}
      />
      <IconButton icon={RefreshCw} label="Refresh tracks" disabled={loading || refreshDisabled} onClick={refresh} />
    </div>
  )
}
