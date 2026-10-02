import {
  Heart, ListMusic, LoaderCircle, Pause, Play, Repeat,
  Shuffle, SkipBack, SkipForward, Volume2, VolumeX,
} from 'lucide-react'
import { timeLabel } from '../lib/format.js'
import { trackAuthor, trackLabel } from '../lib/tracks.js'
import Artwork from './Artwork.jsx'
import IconButton from './IconButton.jsx'

export default function PlayerBar({ audioRef, player, library, queueOpen, onToggleQueue }) {
  const { currentTrack, isLoading, isPlaying, duration, position, volume, isMuted } = player
  const hasTracks = library.collectionTracks.length > 0
  const liked = library.isLiked(currentTrack)
  const effectiveVolume = isMuted ? 0 : volume
  const progress = duration ? position / duration * 100 : 0
  const playIcon = isLoading ? LoaderCircle : isPlaying ? Pause : Play
  const playLabel = isLoading ? 'Cancel loading' : isPlaying ? 'Pause playback' : 'Start playback'

  const changeVolume = (event) => {
    player.setVolume(Number(event.target.value))
    player.setIsMuted(false)
  }

  return (
    <footer className="player-bar" aria-label="Music player">
      <audio ref={audioRef} {...player.audioEvents} preload="metadata" />
      <div className="player-track">
        <Artwork track={currentTrack} small />
        <div>
          <strong>{currentTrack ? trackLabel(currentTrack) : 'Nothing playing yet'}</strong>
          <span>{currentTrack ? trackAuthor(currentTrack) : 'Choose a track to get started'}</span>
        </div>
        {currentTrack && (
          <IconButton
            icon={Heart} label={liked ? 'Unlike current track' : 'Like current track'}
            active={liked} aria-pressed={liked} onClick={() => library.toggleLike(currentTrack)}
          />
        )}
      </div>
      <div className="player-center">
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
        <div className="progress-controls">
          <span>{timeLabel(position)}</span>
          <input
            type="range" aria-label="Seek playback" min="0" max={duration || 1} step="0.1"
            value={Math.min(position, duration || 1)} disabled={!duration || isLoading}
            onChange={(event) => player.seek(event.target.value)} style={{ '--progress': `${progress}%` }}
          />
          <span>{timeLabel(duration)}</span>
        </div>
      </div>
      <div className="player-extras">
        <IconButton
          icon={ListMusic} label="Toggle queue" active={queueOpen} aria-pressed={queueOpen}
          onClick={onToggleQueue}
        />
        <IconButton
          icon={isMuted || volume === 0 ? VolumeX : Volume2} label={isMuted ? 'Unmute' : 'Mute'}
          aria-pressed={isMuted} onClick={() => player.setIsMuted((value) => !value)}
        />
        <input
          type="range" aria-label="Volume" min="0" max="1" step="0.01" value={effectiveVolume}
          onChange={changeVolume} style={{ '--progress': `${effectiveVolume * 100}%` }}
        />
      </div>
    </footer>
  )
}
