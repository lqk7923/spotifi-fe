import { trackKey, trackLabel } from '../../lib/tracks.js'

export default function TrackPlayButton({ track, player, children, className, ...props }) {
  const selected = player.currentTrack && trackKey(track) === trackKey(player.currentTrack)
  const action = selected && player.isPlaying ? 'Pause' : 'Play'

  return (
    <button
      type="button"
      className={className}
      aria-label={`${action} ${trackLabel(track)}`}
      onClick={() => { void player.selectTrack(track) }}
      {...props}
    >
      {children}
    </button>
  )
}

