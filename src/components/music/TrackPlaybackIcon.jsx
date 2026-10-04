import { LoaderCircle, Pause, Play } from 'lucide-react'

export default function TrackPlaybackIcon({ selected, player, size = 18 }) {
  if (selected && player.isLoading) return <LoaderCircle className="spin" size={size} />
  const Icon = selected && player.isPlaying ? Pause : Play
  return <Icon size={size} fill="currentColor" />
}
