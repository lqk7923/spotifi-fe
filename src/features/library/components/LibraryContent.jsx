import { CircleAlert, LoaderCircle, Music2, RefreshCw } from 'lucide-react'
import TrackTable from '../../../components/music/TrackTable.jsx'

export default function LibraryContent({ library, player }) {
  const { loading, error, collectionTracks, visibleTracks, selectedAlbum, likedOnly, refresh, resetFilters } = library
  if (loading) {
    return (
      <div className="track-loading" role="status">
        <LoaderCircle className="spin" size={23} /><p>Loading your tracks…</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="state-panel">
        <span className="state-icon"><CircleAlert size={30} /></span>
        <h3>Your music is taking a break</h3><p role="alert">{error}</p>
        <button className="btn retry-button" onClick={refresh}><RefreshCw size={16} />Try again</button>
      </div>
    )
  }
  if (!visibleTracks.length) {
    if (selectedAlbum && !collectionTracks.length) {
      return (
        <div className="state-panel">
          <span className="state-icon"><Music2 size={32} /></span>
          <h3>No tracks in this album</h3><p>There are no tracks available for this album.</p>
          <button className="btn retry-button" onClick={refresh}><RefreshCw size={16} />Refresh album</button>
        </div>
      )
    }
    let message = 'Add some tracks to your music collection, then refresh to start listening.'
    if (collectionTracks.length) {
      message = likedOnly
        ? 'Like a track using its heart button to save it here.'
        : 'Try another search.'
    }
    return (
      <div className="state-panel">
        <span className="state-icon"><Music2 size={32} /></span>
        <h3>{collectionTracks.length ? 'No matching tracks' : 'Your library starts here'}</h3><p>{message}</p>
        <button className="btn retry-button" onClick={collectionTracks.length
          ? library.search ? () => library.setSearch('') : resetFilters
          : refresh}>
          {collectionTracks.length ? library.search ? 'Clear search' : 'Show all tracks' : 'Refresh library'}
        </button>
      </div>
    )
  }
  return (
    <TrackTable tracks={visibleTracks} player={player} isLiked={library.isLiked}
      onToggleLike={library.toggleLike} showAlbum={!selectedAlbum} />
  )
}
