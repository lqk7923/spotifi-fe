import { LoaderCircle, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from 'lucide-react'
import IconButton from '../../../components/ui/IconButton.jsx'

export default function PlaybackControls({ player, hasTracks }) {
  const { currentTrack, isLoading, isPlaying } = player
  const playIcon = isLoading ? LoaderCircle : isPlaying ? Pause : Play
  const playLabel = isLoading ? 'Cancel loading' : isPlaying ? 'Pause playback' : 'Start playback'
  return (
    <div className="playback-controls">
      <IconButton
        icon={Shuffle} label="Shuffle" active={player.shuffle} aria-pressed={player.shuffle}
        disabled={!hasTracks} onClick={() => player.setShuffle((value) => !value)}
      />
      <IconButton icon={SkipBack} label="Previous track" disabled={!hasTracks} onClick={() => { void player.skip(-1) }} />
      <IconButton
        icon={playIcon} label={playLabel} className={`main-play ${isLoading ? 'spin-icon' : ''}`}
        disabled={!hasTracks && !currentTrack} onClick={() => { void player.togglePlayback() }}
      />
      <IconButton icon={SkipForward} label="Next track" disabled={!hasTracks} onClick={() => { void player.skip(1) }} />
      <IconButton
        icon={Repeat} label="Repeat track" active={player.repeat} aria-pressed={player.repeat}
        disabled={!hasTracks} onClick={() => player.setRepeat((value) => !value)}
      />
    </div>
  )
}
