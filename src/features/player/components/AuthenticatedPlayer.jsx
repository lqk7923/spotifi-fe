import { useRef, useState } from 'react'
import useAudioPlayer from '../hooks/useAudioPlayer.js'

// Mount audio and its preloader only for authenticated sessions.
export default function AuthenticatedPlayer({ tracks, loading, error, children }) {
  const audioRef = useRef(null)
  const [queue, setQueue] = useState(tracks)
  // Keep the current playback collection while the next page is loading or unavailable.
  if (!loading && !error && tracks !== queue) setQueue(tracks)
  const player = useAudioPlayer(queue, audioRef)
  return (
    <>
      <audio ref={audioRef} {...player.audioEvents} preload="metadata" hidden />
      {children({ ...player, tracks: queue })}
    </>
  )
}
