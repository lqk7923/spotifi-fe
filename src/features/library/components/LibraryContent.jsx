import { CircleAlert, Heart, LoaderCircle, Music2, RefreshCw } from 'lucide-react'
import TrackTable from '../../../components/music/TrackTable.jsx'

export default function LibraryContent({ library, player }) {
  const { loading, error, collectionTracks, selectedAlbum, likedOnly, refresh, showAll } = library
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
  if (!collectionTracks.length) {
    if (likedOnly) {
      return (
        <div className="state-panel">
          <span className="state-icon"><Heart size={32} /></span>
          <h2>No liked songs yet</h2><p>Songs saved to your account will appear here.</p>
          <button className="btn retry-button" onClick={showAll}>Show all tracks</button>
        </div>
      )
    }
    if (selectedAlbum) {
      return (
        <div className="state-panel">
          <span className="state-icon"><Music2 size={32} /></span>
          <h3>No tracks in this album</h3><p>There are no tracks available for this album.</p>
          <button className="btn retry-button" onClick={refresh}><RefreshCw size={16} />Refresh album</button>
        </div>
      )
    }
    return (
      <div className="state-panel">
        <span className="state-icon"><Music2 size={32} /></span>
        <h3>Your library starts here</h3>
        <p>Add some tracks to your music collection, then refresh to start listening.</p>
        <button className="btn retry-button" onClick={refresh}>Refresh library</button>
      </div>
    )
  }
  return (
    <TrackTable tracks={collectionTracks} player={player} isLiked={library.isLiked} showAlbum={!selectedAlbum} />
  )
}
