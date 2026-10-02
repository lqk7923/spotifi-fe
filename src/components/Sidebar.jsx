import { Headphones, Heart, Home, Library, ListMusic, Music2, Search } from 'lucide-react'

export default function Sidebar({ library, onHome, onSearch, onLibrary }) {
  const { bucket, buckets, likedOnly, likedCount, resetFilters, setBucket, setLikedOnly } = library

  const showAll = () => {
    resetFilters()
    onLibrary()
  }
  const showLiked = () => {
    setLikedOnly((value) => !value)
    setBucket('')
    onLibrary()
  }
  const showBucket = (name) => {
    setBucket(name)
    setLikedOnly(false)
    onLibrary()
  }

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <a className="brand" href="/home" aria-label="Spotifi home">
        <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="20" cy="20" r="20" fill="currentColor" />
          <path
            d="M9 15c8-3 17-2 23 2M11 21c7-2 14-1 19 2M13 27c5-1 10-1 15 2"
            stroke="#000" strokeWidth="3" strokeLinecap="round"
          />
        </svg>
        <span>Spotifi</span>
      </a>
      <nav className="nav-links">
        <button className={`nav-item ${!likedOnly && !bucket ? 'nav-active' : ''}`} onClick={onHome}>
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
        <p className="eyebrow">YOUR COLLECTIONS</p>
        {buckets.map((name) => (
          <button
            key={name}
            className={`bucket-link ${bucket === name ? 'active' : ''}`}
            onClick={() => showBucket(name)}
          >
            <Music2 size={15} /><span>{name}</span>
          </button>
        ))}
        {!buckets.length && <p className="sidebar-hint">Your music collections will appear here.</p>}
      </div>
      <div className="sidebar-bottom"><Headphones size={16} /><span>Made for listening.</span></div>
    </aside>
  )
}
