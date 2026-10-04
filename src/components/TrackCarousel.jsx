import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function TrackCarousel({ children }) {
  const scrollRef = useRef(null)
  const [edges, setEdges] = useState({ overflow: false, start: true, end: true })

  useEffect(() => {
    const viewport = scrollRef.current
    const update = () => {
      const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
      const next = {
        overflow: max > 1,
        start: viewport.scrollLeft <= 1,
        end: viewport.scrollLeft >= max - 1,
      }
      setEdges((previous) => previous.overflow === next.overflow && previous.start === next.start && previous.end === next.end
        ? previous : next)
    }
    const observer = new ResizeObserver(update)
    observer.observe(viewport)
    viewport.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      viewport.removeEventListener('scroll', update)
    }
  }, [children.length])

  const scroll = (direction) => {
    const viewport = scrollRef.current
    const card = viewport.firstElementChild
    const step = card.offsetWidth + Number.parseFloat(getComputedStyle(viewport).columnGap)
    const distance = Math.max(1, Math.floor(viewport.clientWidth / step)) * step
    viewport.scrollBy({
      left: direction * distance,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
  }

  return (
    <div className="track-carousel">
      <div ref={scrollRef} className="track-grid" id="repeat-tracks">{children}</div>
      {edges.overflow && (
        <>
          <div className={`track-scroll-edge track-scroll-edge-left${edges.start ? ' is-at-edge' : ''}`}>
            <button type="button" className="track-scroll-button track-scroll-previous"
              aria-label="Scroll tracks left" aria-controls="repeat-tracks" disabled={edges.start}
              onClick={() => scroll(-1)}>
              <ChevronLeft size={28} strokeWidth={1.5} />
            </button>
          </div>
          <div className={`track-scroll-edge track-scroll-edge-right${edges.end ? ' is-at-edge' : ''}`}>
            <button type="button" className="track-scroll-button track-scroll-next"
              aria-label="Scroll tracks right" aria-controls="repeat-tracks" disabled={edges.end}
              onClick={() => scroll(1)}>
              <ChevronRight size={28} strokeWidth={1.5} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
