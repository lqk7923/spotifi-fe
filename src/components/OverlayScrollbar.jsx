import { useEffect, useState } from 'react'

export default function OverlayScrollbar({ scrollRef }) {
  const [metrics, setMetrics] = useState({ max: 0, value: 0, thumbSize: 36 })

  useEffect(() => {
    const viewport = scrollRef.current
    if (!viewport) return

    const update = () => {
      const max = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
      const value = Math.min(max, Math.max(0, viewport.scrollTop))
      const trackHeight = Math.max(0, viewport.clientHeight - 12)
      const thumbSize = Math.min(trackHeight, Math.max(36, trackHeight * viewport.clientHeight / viewport.scrollHeight))
      setMetrics((previous) => previous.max === max && previous.value === value && previous.thumbSize === thumbSize
        ? previous : { max, value, thumbSize })
    }

    const observer = new ResizeObserver(update)
    observer.observe(viewport)
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild)
    viewport.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      viewport.removeEventListener('scroll', update)
    }
  }, [scrollRef])

  if (!metrics.max) return null

  return (
    <input
      className="overlay-scrollbar" type="range" aria-label="Scroll page" aria-orientation="vertical"
      min="0" max={metrics.max} step="any" value={metrics.value}
      style={{ '--scroll-thumb-size': `${metrics.thumbSize}px` }}
      onChange={(event) => { scrollRef.current.scrollTop = Number(event.target.value) }}
    />
  )
}
