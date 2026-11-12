import { CircleAlert } from 'lucide-react'

export default function PlaybackError({ player }) {
  if (!player.error) return null
  return (
    <div className="playback-error alert" role="alert">
      <CircleAlert size={19} /><span>{player.error}</span>
      <button type="button" className="text-button" onClick={() => { void player.startTrack(player.currentTrack, player.position) }}>
        Retry
      </button>
    </div>
  )
}
