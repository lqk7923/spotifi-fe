import { useRef } from 'react'
import OverlayScrollbar from './OverlayScrollbar.jsx'

// A fragment preserves each owner's grid and positioning context for the scrollbar.
export default function ScrollArea({ scrollRef, className, contentClassName, label, scrollbarLabel, children }) {
  const localRef = useRef(null)
  const viewportRef = scrollRef || localRef

  return (
    <>
      <div ref={viewportRef} className={className} tabIndex={0} aria-label={label}>
        <div className={contentClassName}>{children}</div>
      </div>
      <OverlayScrollbar scrollRef={viewportRef} label={scrollbarLabel} />
    </>
  )
}
