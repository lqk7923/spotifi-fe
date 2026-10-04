import { useRef, useState } from 'react'
import { COLLAPSED_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH, sidebarWidth, stepSidebarWidth } from './sidebarSizing.js'

export default function SidebarResizer({ side, controlsId, width, onResize, collapsible = false }) {
  const dragRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const direction = side === 'left' ? 1 : -1

  const stopDragging = () => {
    dragRef.current = null
    setDragging(false)
  }

  return (
    <div
      className={`sidebar-resizer ${side}-resizer${dragging ? ' dragging' : ''}`}
      role="separator"
      tabIndex={0}
      aria-label={`Resize ${side} sidebar`}
      aria-orientation="vertical"
      aria-controls={controlsId}
      aria-valuemin={collapsible ? COLLAPSED_SIDEBAR_WIDTH : MIN_SIDEBAR_WIDTH}
      aria-valuemax={MAX_SIDEBAR_WIDTH}
      aria-valuenow={width}
      aria-valuetext={width === COLLAPSED_SIDEBAR_WIDTH ? 'Collapsed, 72 pixels' : `${width} pixels`}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.focus()
        event.currentTarget.setPointerCapture(event.pointerId)
        dragRef.current = { x: event.clientX, width }
        setDragging(true)
      }}
      onPointerMove={(event) => {
        if (!dragRef.current) return
        const requestedWidth = dragRef.current.width + direction * (event.clientX - dragRef.current.x)
        onResize(sidebarWidth(requestedWidth, collapsible))
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
        stopDragging()
      }}
      onPointerCancel={stopDragging}
      onLostPointerCapture={stopDragging}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault()
          const delta = (event.key === 'ArrowRight' ? 10 : -10) * direction
          onResize(stepSidebarWidth(width, delta, collapsible))
        } else if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault()
          onResize(event.key === 'End' ? MAX_SIDEBAR_WIDTH : collapsible ? COLLAPSED_SIDEBAR_WIDTH : MIN_SIDEBAR_WIDTH)
        }
      }}
    />
  )
}
