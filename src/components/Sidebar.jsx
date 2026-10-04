import { useRef } from 'react'
import { Headphones, Heart, Library, ListMusic, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { albumPath } from '../lib/navigation.js'
import SidebarMediaItem from './SidebarMediaItem.jsx'
import OverlayScrollbar from './OverlayScrollbar.jsx'

export default function Sidebar({ library, onSearch, onLibrary, collapsed, onToggleCollapse }) {
  const scrollRef = useRef(null)
  const { selectedAlbum, albums, likedOnly, likedCount, resetFilters } = library

  const showAll = () => {
    resetFilters()
    onLibrary()
  }
  const showLiked = () => {
    library.showLiked()
    onLibrary()
  }

  return (
    <aside id="library-sidebar" className="sidebar" aria-label="Main navigation">
      <div className="sidebar-scroll" ref={scrollRef} tabIndex={0} aria-label="Library navigation">
        <div className="sidebar-body">
          <div className="sidebar-header">
            <h2 className="sidebar-heading">Your Library</h2>
            <button
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
            </button>
          </div>
          <nav className="nav-links">
            <button className="nav-item" onClick={onSearch} aria-label="Search" title="Search"><Search size={23} />Search</button>
          </nav>
          <div className="nav-collection">
            <button className="nav-item" onClick={showAll} aria-label="All tracks" title="All tracks">
              <span className="square-icon"><ListMusic size={19} /></span>All tracks
            </button>
            <button className={`nav-item ${likedOnly ? 'nav-active' : ''}`} onClick={showLiked} aria-label={`Liked Songs, ${likedCount} tracks`} title="Liked Songs">
              <span className="square-icon liked-square"><Heart size={16} fill="currentColor" /></span>
              Liked Songs<span className="nav-count">{likedCount}</span>
            </button>
          </div>
          <div className="sidebar-divider" />
          <div className="sidebar-library">
            <p className="eyebrow">YOUR ALBUMS</p>
            {albums.map((album) => (
              <SidebarMediaItem
                key={album.albumId}
                track={album}
                current={selectedAlbum?.albumId === album.albumId}
                title={album.albumTitle || 'Untitled album'}
                subtitle={`Album${album.author?.trim() ? ` • ${album.author.trim()}` : ''}`}
                label={`${album.albumTitle || 'Untitled album'}${album.author ? ` by ${album.author}` : ''}`}
                href={albumPath(album.albumId)}
              />
            ))}
            {!albums.length && <p className="sidebar-hint">Your albums will appear here.</p>}
          </div>
          <div className="sidebar-bottom"><Headphones size={16} /><span>Made for listening.</span></div>
        </div>
      </div>
      <OverlayScrollbar scrollRef={scrollRef} label="Scroll library" />
    </aside>
  )
}
