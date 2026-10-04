export const COLLAPSED_SIDEBAR_WIDTH = 72
export const MIN_SIDEBAR_WIDTH = 280
export const MAX_SIDEBAR_WIDTH = 420

export function sidebarWidth(requestedWidth, collapsible = false) {
  const collapseThreshold = (COLLAPSED_SIDEBAR_WIDTH + MIN_SIDEBAR_WIDTH) / 2
  if (collapsible && requestedWidth < collapseThreshold) return COLLAPSED_SIDEBAR_WIDTH
  return Math.round(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, requestedWidth)))
}

export function stepSidebarWidth(width, delta, collapsible = false) {
  if (collapsible && delta > 0 && width === COLLAPSED_SIDEBAR_WIDTH) return MIN_SIDEBAR_WIDTH
  if (collapsible && delta < 0 && width === MIN_SIDEBAR_WIDTH) return COLLAPSED_SIDEBAR_WIDTH
  return sidebarWidth(width + delta, collapsible)
}
