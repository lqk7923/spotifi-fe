import { ListMusic } from 'lucide-react'
import IconButton from '../../../components/ui/IconButton.jsx'
import NowPlaying from './NowPlaying.jsx'
import PlaybackControls from './PlaybackControls.jsx'
import PlaybackProgress from './PlaybackProgress.jsx'
import VolumeControl from './VolumeControl.jsx'

export default function BottomBar({ player, library, queueOpen, onToggleQueue }) {
  const hasTracks = library.collectionTracks.length > 0
  return (
    <footer className="player-bar" aria-label="Music player">
      <NowPlaying player={player} library={library} />
      <div className="player-center">
        <PlaybackControls player={player} hasTracks={hasTracks} />
        <PlaybackProgress player={player} />
      </div>
      <div className="player-extras">
        <IconButton
          icon={ListMusic} label="Toggle queue" active={queueOpen} aria-pressed={queueOpen}
          onClick={onToggleQueue}
        />
        <VolumeControl player={player} />
      </div>
    </footer>
  )
}
