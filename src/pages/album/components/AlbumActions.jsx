import { RefreshCw, Shuffle } from 'lucide-react'
import { trackKey } from '../../../lib/tracks.js'
import IconButton from '../../../components/ui/IconButton.jsx'
import TrackPlaybackIcon from '../../../components/music/TrackPlaybackIcon.jsx'

export default function AlbumActions({ library, player }) {
  const { loading, error, collectionTracks, selectedAlbum, refresh } = library
  const albumTrackSelected = selectedAlbum && player.currentTrack && collectionTracks.some(
    (track) => trackKey(track) === trackKey(player.currentTrack),
  )
  const albumPlaying = albumTrackSelected && player.isPlaying

  return (
    <div className="album-actions">
      <h2 id="library-title" className="sr-only">Tracks</h2>
      <button
        type="button" className="album-play"
        aria-label={`${albumPlaying ? 'Pause' : 'Play'} album ${selectedAlbum.title || 'Album'}`}
        disabled={loading || !!error || !collectionTracks.length}
        onClick={() => {
          void (albumTrackSelected ? player.togglePlayback() : player.startTrack(collectionTracks[0]))
        }}
      >
        <TrackPlaybackIcon selected={albumTrackSelected} player={player} size={24} />
      </button>
      <IconButton
        icon={Shuffle} label="Shuffle album" active={player.shuffle} aria-pressed={player.shuffle}
        disabled={loading || !!error || !collectionTracks.length}
        onClick={() => player.setShuffle((value) => !value)}
      />
      <IconButton icon={RefreshCw} label="Refresh tracks" disabled={loading} onClick={refresh} />
    </div>
  )
}
