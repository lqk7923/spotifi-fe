import { useRef } from 'react'
import useAudioPlayer from '../hooks/useAudioPlayer.js'

// Mount audio and its preloader only for authenticated sessions.
export default function AuthenticatedPlayer({ tracks, children }) {
  const audioRef = useRef(null)
  const player = useAudioPlayer(tracks, audioRef)
  return (
    <>
      <audio ref={audioRef} {...player.audioEvents} preload="metadata" hidden />
      {children(player)}
    </>
  )
}
