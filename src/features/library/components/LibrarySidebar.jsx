import { Headphones, Library, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import LikedSongsArtwork from '../../../components/music/LikedSongsArtwork.jsx'
import ScrollArea from '../../../components/ui/ScrollArea.jsx'
import SidebarPanel from '../../../layouts/music/sidebar/SidebarPanel.jsx'

export default function LibrarySidebar({ library, onSearch, collapsed, compact = false, onToggleCollapse }) {
  const { likedOnly, likedCount } = library

  return (
    <SidebarPanel id="library-sidebar" side="left" className="sidebar" label="Main navigation" collapsed={collapsed}>
      <ScrollArea className="sidebar-scroll" contentClassName="sidebar-body" label="Library navigation" scrollbarLabel="Scroll library">
        <div className="sidebar-header">
          <h2 className="sidebar-heading">Your Library</h2>
          {compact ? <span className="sidebar-mobile-icon" aria-hidden="true"><Library size={24} /></span> : <button
            type="button" className="icon-button sidebar-toggle"
            aria-label={collapsed ? 'Expand library' : 'Collapse library'}
            title={collapsed ? 'Expand library' : 'Collapse library'}
            aria-expanded={!collapsed} onClick={onToggleCollapse}
          >
            {collapsed ? (
              <>
                <Library className="sidebar-library-icon" size={24} aria-hidden="true" />
                <PanelLeftOpen className="sidebar-expand-icon" size={24} aria-hidden="true" />
              </>
            ) : <PanelLeftClose size={24} aria-hidden="true" />}
          </button>}
        </div>
        <nav className="nav-links">
          <button className="nav-item" onClick={onSearch} aria-label="Search" title="Search"><Search size={23} />Search</button>
        </nav>
        <div className="nav-collection">
          <button type="button" className={`nav-item ${likedOnly ? 'nav-active' : ''}`} onClick={library.showLiked}
            aria-current={likedOnly ? 'page' : undefined}
            aria-label={likedCount === null ? 'Liked Songs' : `Liked Songs, ${likedCount} tracks`} title="Liked Songs">
            <LikedSongsArtwork />
            Liked Songs{likedCount !== null && <span className="nav-count">{likedCount}</span>}
          </button>
        </div>
        <div className="sidebar-bottom"><Headphones size={16} /><span>Made for listening.</span></div>
      </ScrollArea>
    </SidebarPanel>
  )
}
