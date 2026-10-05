import { useEffect, useRef, useState } from 'react'
import { COLLAPSED_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH } from './sidebar/sidebarSizing.js'

const COMPACT_VIEWPORT = '(width < 1000px)'
// Keep this in sync with the mobile media query in responsive.css.
const MOBILE_VIEWPORT = '(max-width: 767px), (max-width: 1000px) and (max-height: 500px) and (orientation: landscape)'

export default function useMusicLayout() {
  const [leftWidth, setLeftWidth] = useState(MIN_SIDEBAR_WIDTH)
  const [rightWidth, setRightWidth] = useState(MIN_SIDEBAR_WIDTH)
  const [queueCollapsed, setQueueCollapsed] = useState(() => window.matchMedia(COMPACT_VIEWPORT).matches)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_VIEWPORT).matches)
  const expandedLeftWidth = useRef(MIN_SIDEBAR_WIDTH)
  const sidebarCollapsed = isMobile || leftWidth === COLLAPSED_SIDEBAR_WIDTH

  useEffect(() => {
    const media = window.matchMedia(MOBILE_VIEWPORT)
    const update = event => setIsMobile(event.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const media = window.matchMedia(COMPACT_VIEWPORT)
    const collapseOnNarrowScreen = event => {
      if (event.matches) setQueueCollapsed(true)
    }
    media.addEventListener('change', collapseOnNarrowScreen)
    return () => media.removeEventListener('change', collapseOnNarrowScreen)
  }, [])

  const resizeLeftSidebar = (width) => {
    if (width !== COLLAPSED_SIDEBAR_WIDTH) expandedLeftWidth.current = width
    setLeftWidth(width)
  }

  return {
    leftWidth: isMobile ? COLLAPSED_SIDEBAR_WIDTH : leftWidth,
    rightWidth, sidebarCollapsed, queueCollapsed: isMobile || queueCollapsed, isMobile,
    resizeLeftSidebar, resizeRightSidebar: setRightWidth,
    toggleLibrary: () => {
      if (!isMobile) resizeLeftSidebar(sidebarCollapsed ? expandedLeftWidth.current : COLLAPSED_SIDEBAR_WIDTH)
    },
    collapseQueue: () => setQueueCollapsed(true),
    expandQueue: () => setQueueCollapsed(false),
    toggleQueue: () => setQueueCollapsed(value => !value),
  }
}
