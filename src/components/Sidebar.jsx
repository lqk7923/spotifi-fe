import { Headphones, Heart, Home, Library, ListMusic, Music2, Search } from 'lucide-react'
import { albumPath } from '../lib/navigation.js'
import AppLink from './AppLink.jsx'

export default function Sidebar({ library, onHome, onSearch, onLibrary }) {
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
          <AppLink
            key={album.albumId}
            className={`bucket-link ${selectedAlbum?.albumId === album.albumId ? 'active' : ''}`}
            aria-current={selectedAlbum?.albumId === album.albumId ? 'page' : undefined}
            title={album.albumTitle}
            href={albumPath(album.albumId)}
          >
            <Music2 size={15} /><span>{album.albumTitle || 'Untitled album'}</span>
          </AppLink>
        ))}
        {!albums.length && <p className="sidebar-hint">Your albums will appear here.</p>}
      </div>
      <div className="sidebar-bottom"><Headphones size={16} /><span>Made for listening.</span></div>
    </aside>
  )
}
