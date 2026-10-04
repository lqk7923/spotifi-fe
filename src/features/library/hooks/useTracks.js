import { useEffect, useState } from 'react'
import { errorMessage, getTracks } from '../../../services/music-api.js'

export default function useTracks() {
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getTracks(controller.signal)
      .then(result => {
        if (!controller.signal.aborted) setTracks(result)
      })
      .catch(cause => {
        if (!controller.signal.aborted) setError(errorMessage(cause, 'Could not load your music.'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [reload])

  const refresh = () => {
    setLoading(true)
    setError('')
    setReload(value => value + 1)
  }

  return { tracks, loading, error, refresh }
}
