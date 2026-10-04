import SidebarResizer from './sidebar/SidebarResizer.jsx'

export default function MusicLayout({ layout, hasCurrentTrack, topBar, leftSidebar, rightSidebar, bottomBar, children }) {
  const { leftWidth, rightWidth, sidebarCollapsed, queueCollapsed, resizeLeftSidebar, resizeRightSidebar } = layout

  return (
    <div
      className={`music-app${hasCurrentTrack ? '' : ' playback-idle'}${sidebarCollapsed ? ' sidebar-collapsed' : ''}${queueCollapsed ? ' queue-collapsed' : ''}`}
      style={{ '--sidebar-left-width': `${leftWidth}px`, '--sidebar-right-width': `${rightWidth}px` }}
      data-theme="dark"
    >
      <a className="skip-link" href="#all-tracks">Skip to tracks</a>
      {topBar}
      {leftSidebar}
      <SidebarResizer side="left" controlsId="library-sidebar" width={leftWidth} onResize={resizeLeftSidebar} collapsible />
      {children}
      {!queueCollapsed && <SidebarResizer side="right" controlsId="playback-queue" width={rightWidth} onResize={resizeRightSidebar} />}
      {rightSidebar}
      {bottomBar}
    </div>
  )
}
