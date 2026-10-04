export default function SidebarPanel({
  id, side, label, className = '', collapsed = false, collapseMode = 'icons',
  controls, collapsedContent, children,
}) {
  const rail = collapseMode === 'rail'

  return (
    <aside id={id} className={`sidebar-panel ${className}`} aria-label={label} data-side={side} data-collapsed={collapsed}>
      {controls}
      {rail ? <div className="sidebar-expanded-content" inert={collapsed}>{children}</div> : children}
      {collapsed && collapsedContent}
    </aside>
  )
}
