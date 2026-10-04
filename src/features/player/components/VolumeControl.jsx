import { Volume2, VolumeX } from 'lucide-react'
import IconButton from '../../../components/ui/IconButton.jsx'

export default function VolumeControl({ player }) {
  const { volume, isMuted } = player
  const effectiveVolume = isMuted ? 0 : volume
  const changeVolume = event => {
    player.setVolume(Number(event.target.value))
    player.setIsMuted(false)
  }
  return (
    <>
      <IconButton
        icon={isMuted || volume === 0 ? VolumeX : Volume2} label={isMuted ? 'Unmute' : 'Mute'}
        aria-pressed={isMuted} onClick={() => player.setIsMuted((value) => !value)}
      />
      <input
        type="range" aria-label="Volume" min="0" max="1" step="0.01" value={effectiveVolume}
        onChange={changeVolume} style={{ '--progress': `${effectiveVolume * 100}%` }}
      />
    </>
  )
}
