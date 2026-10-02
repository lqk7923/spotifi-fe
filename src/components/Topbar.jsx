import { Search, UserRound, X } from 'lucide-react'

export default function Topbar({ search, onSearchChange, searchRef }) {
  return (
    <header className="topbar">
      <label className="search-field input">
        <Search size={19} aria-hidden="true" />
        <span className="sr-only">Search tracks</span>
        <input
          ref={searchRef}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search your music"
        />
        {search && (
          <button type="button" aria-label="Clear search" onClick={() => onSearchChange('')}>
            <X size={16} />
          </button>
        )}
      </label>
      <div className="guest-profile">
        <span><UserRound size={17} /></span><span>Music lover</span>
      </div>
    </header>
  )
}
