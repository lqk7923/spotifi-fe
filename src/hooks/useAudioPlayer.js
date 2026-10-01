import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { errorMessage, trackKey } from '../lib/music-api'
import { AudioPreloader } from '../lib/audio-preload'

export default function useAudioPlayer(tracks, audioRef) {
  const requestRef = useRef(null)
  const sessionRef = useRef(null)
  const sequenceRef = useRef(0)
  const pendingRef = useRef(false)
  const preloadRef = useRef(null)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [shuffleSeed, setShuffleSeed] = useState(() => Math.random())
  const [repeat, setRepeat] = useState(false)

  const nextTrack = useMemo(() => {
    if (!tracks.length) return null
    if (!currentTrack) return tracks[0]
    if (tracks.length === 1) return null
    const index = tracks.findIndex((track) => trackKey(track) === trackKey(currentTrack))
    const offset = shuffle ? 1 + Math.floor(shuffleSeed * (tracks.length - 1)) : 1
    return tracks[(Math.max(index, 0) + offset) % tracks.length]
  }, [tracks, currentTrack, shuffle, shuffleSeed])

  useEffect(() => {
    preloadRef.current = new AudioPreloader()
    return () => {
      sequenceRef.current += 1
      requestRef.current?.abort()
      preloadRef.current.dispose()
    }
  }, [])

  useEffect(() => {
    // Let the current track start before competing for network bandwidth.
    if (!currentTrack || isPlaying) preloadRef.current.preload(nextTrack)
    else if (preloadRef.current.next?.key !== (nextTrack && trackKey(nextTrack))) preloadRef.current.preload(null)
  }, [currentTrack, isPlaying, nextTrack])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
      audioRef.current.muted = isMuted
    }
  }, [audioRef, volume, isMuted])

  const startTrack = useCallback(async (track, resumeAt = 0, automaticRetry = false) => {
    const audio = audioRef.current
    if (!audio || !track) return
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    const sequence = ++sequenceRef.current
    pendingRef.current = true
    sessionRef.current = { track, signedAt: 0, retried: automaticRetry, resumeAt }
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    preloadRef.current.release()
    setCurrentTrack(track)
    setShuffleSeed(Math.random())
    setIsLoading(true)
    setIsPlaying(false)
    setPosition(resumeAt)
    setDuration(0)
    setError('')
    try {
      const source = await preloadRef.current.source(track, controller.signal, automaticRetry)
      if (sequence !== sequenceRef.current) return
      sessionRef.current.signedAt = source.signedAt
      sessionRef.current.cached = source.cached
      audio.src = source.url
      audio.load()
      await audio.play()
      if (sequence !== sequenceRef.current) return
      setIsPlaying(!audio.paused)
    } catch (cause) {
      if (controller.signal.aborted || sequence !== sequenceRef.current) return
      setIsPlaying(false)
      setError(cause.name === 'NotAllowedError'
        ? 'Your browser paused playback. Press play to listen.'
        : audio.error
          ? 'This audio file is unavailable or cannot be played. Press play to retry.'
          : errorMessage(cause, 'This track could not be played. Please try again.'))
    } finally {
      if (sequence === sequenceRef.current) {
        pendingRef.current = false
        setIsLoading(false)
      }
    }
  }, [audioRef])

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current
    if (pendingRef.current) {
      ++sequenceRef.current
      requestRef.current?.abort()
      pendingRef.current = false
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      preloadRef.current.release()
      setIsLoading(false)
      setIsPlaying(false)
      return
    }
    if (!currentTrack) {
      if (tracks[0]) await startTrack(tracks[0])
      return
    }
    if (!audio.paused) {
      audio.pause()
      return
    }
    const session = sessionRef.current
    if (error || !audio.getAttribute('src') || (!session.cached && Date.now() - session.signedAt > 110000) || audio.ended) {
      await startTrack(currentTrack, audio.ended ? 0 : audio.currentTime)
      return
    }
    try {
      await audio.play()
    } catch {
      setError('Playback could not start. Press play to try again.')
    }
  }, [audioRef, currentTrack, error, startTrack, tracks])

  const selectTrack = useCallback((track) => {
    if (currentTrack && trackKey(track) === trackKey(currentTrack)) return togglePlayback()
    return startTrack(track)
  }, [currentTrack, startTrack, togglePlayback])

  const skip = useCallback((direction, fromEnd = false) => {
    if (!tracks.length) return
    const index = tracks.findIndex((track) => currentTrack && trackKey(track) === trackKey(currentTrack))
    if (direction < 0 && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0
      setPosition(0)
      return
    }
    if (fromEnd && repeat) return startTrack(currentTrack)
    if (direction > 0 && nextTrack) {
      if (fromEnd && !shuffle && index === tracks.length - 1) {
        setIsPlaying(false)
        return
      }
      return startTrack(nextTrack)
    }
    let next = index + direction
    if (shuffle && tracks.length > 1) {
      next = (Math.max(index, 0) + 1 + Math.floor(Math.random() * (tracks.length - 1))) % tracks.length
    } else if (fromEnd && next >= tracks.length) {
      setIsPlaying(false)
      return
    }
    return startTrack(tracks[(next + tracks.length) % tracks.length])
  }, [audioRef, currentTrack, nextTrack, repeat, shuffle, startTrack, tracks])

  const seek = (value) => {
    const audio = audioRef.current
    if (audio && duration > 0 && !isLoading) {
      audio.currentTime = Math.min(duration, Math.max(0, Number(value)))
      setPosition(audio.currentTime)
    }
  }

  const onMetadata = () => {
    const audio = audioRef.current
    const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0
    setDuration(nextDuration)
    if (sessionRef.current?.resumeAt > 0 && nextDuration > 0) {
      audio.currentTime = Math.min(sessionRef.current.resumeAt, Math.max(0, nextDuration - 0.1))
      sessionRef.current.resumeAt = 0
    }
  }

  const onAudioError = () => {
    const audio = audioRef.current
    const session = sessionRef.current
    if (!session || !audio.getAttribute('src') || audio.error?.code === 1) return
    if (!session.retried && [2, 4].includes(audio.error?.code)) {
      // Refresh once for expired signatures; never loop on missing R2 objects.
      void startTrack(session.track, audio.currentTime || session.resumeAt, true)
      return
    }
    setIsPlaying(false)
    setError('This audio file is unavailable or cannot be played. Press play to retry.')
  }

  return {
    currentTrack, isPlaying, isLoading, error, position, duration,
    volume, setVolume, isMuted, setIsMuted, shuffle, setShuffle, repeat, setRepeat,
    startTrack, selectTrack, togglePlayback, skip, seek,
    audioEvents: {
      onPlay: () => setIsPlaying(true),
      onPause: () => setIsPlaying(false),
      onTimeUpdate: () => setPosition(audioRef.current.currentTime),
      onLoadedMetadata: onMetadata,
      onDurationChange: onMetadata,
      onEnded: () => { void skip(1, true) },
      onError: onAudioError,
    },
  }
}
