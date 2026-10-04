import { timeLabel } from '../../../lib/format.js'

export default function PlaybackProgress({ player }) {
  const { duration, position, isLoading } = player
  const progress = duration ? position / duration * 100 : 0
  return (
    <div className="progress-controls">
      <span>{timeLabel(position)}</span>
      <input
        type="range" aria-label="Seek playback" min="0" max={duration || 1} step="0.1"
        value={Math.min(position, duration || 1)} disabled={!duration || isLoading}
        onChange={(event) => player.seek(event.target.value)} style={{ '--progress': `${progress}%` }}
      />
      <span>{timeLabel(duration)}</span>
    </div>
  )
}
