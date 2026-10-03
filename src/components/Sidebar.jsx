import { useRef } from 'react'
import { Headphones, Heart, Home, Library, ListMusic, Search } from 'lucide-react'
import { albumPath } from '../lib/navigation.js'
import SidebarMediaItem from './SidebarMediaItem.jsx'
import OverlayScrollbar from './OverlayScrollbar.jsx'

export default function Sidebar({ library, onHome, onSearch, onLibrary }) {
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
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar-scroll" ref={scrollRef} tabIndex={0} aria-label="Library navigation">
        <div className="sidebar-body">
          <nav className="nav-links">
            <button className={`nav-item ${!likedOnly && !selectedAlbum ? 'nav-active' : ''}`} onClick={onHome}>
              <Home size={23} />Home
            </button>
            <button className="nav-item" onClick={onSearch}><Search size={23} />Search</button>
            <button className="nav-item" onClick={onLibrary}><Library size={23} />Your Library</button>
          </nav>
          <div className="nav-collection">
            <button className="nav-item" onClick={showAll}>
              <span className="square-icon"><ListMusic size={19} /></span>All tracks
            </button>
            <button className={`nav-item ${likedOnly ? 'nav-active' : ''}`} onClick={showLiked}>
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
