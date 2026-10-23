import { Home, LogOut, Search, UserRound, X } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import AppLink from '../../../app/routing/AppLink.jsx'
import { auth } from '../../../services/keycloak.js'

export default function TopBar({ search, onSearchChange, searchRef, onHome }) {
  const { user } = useSyncExternalStore(auth.subscribe, auth.getSnapshot)
  return (
    <header className="topbar">
      <AppLink className="brand" href="/" aria-label="Spotifi home" onClick={onHome}>
        <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="20" cy="20" r="20" fill="currentColor" />
          <path
            d="M9 15c8-3 17-2 23 2M11 21c7-2 14-1 19 2M13 27c5-1 10-1 15 2"
            stroke="#000" strokeWidth="3" strokeLinecap="round"
          />
        </svg>
        <span>Spotifi</span>
      </AppLink>
      <div className="topbar-search">
        <AppLink className="icon-button topbar-home" href="/" aria-label="Home" title="Home" onClick={onHome}>
          <Home size={24} aria-hidden="true" />
        </AppLink>
        <label className="search-field input">
          <Search size={24} aria-hidden="true" />
          <span className="sr-only">Search tracks</span>
          <input
            ref={searchRef}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="What do you want to play?"
          />
          {search && (
            <button type="button" aria-label="Clear search" onClick={() => onSearchChange('')}>
              <X size={16} />
            </button>
          )}
        </label>
      </div>
      <div className="guest-profile">
        <span aria-hidden="true"><UserRound size={17} /></span><span title={user?.name}>{user?.name}</span>
        <button type="button" className="icon-button" aria-label="Log out" title="Log out" onClick={() => void auth.logout()}>
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
