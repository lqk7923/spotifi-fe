import { AudioLines, CircleAlert, Clock3, Heart, LoaderCircle, Music2, Play, RefreshCw } from 'lucide-react'
import { timeLabel } from '../lib/format.js'
import { trackAuthor, trackDurationSeconds, trackKey, trackLabel } from '../lib/tracks.js'
import { albumPath } from '../lib/navigation.js'
import AppLink from './AppLink.jsx'
import Artwork from './Artwork.jsx'
import IconButton from './IconButton.jsx'
import TrackPlayButton, { TrackPlaybackIcon } from './TrackPlayButton.jsx'

function TrackRow({ track, index, player, library }) {
  const selected = player.currentTrack && trackKey(track) === trackKey(player.currentTrack)
  const liked = library.isLiked(track)
  const subtitle = trackAuthor(track)
  const duration = selected && player.duration > 0 ? player.duration : trackDurationSeconds(track)

  return (
    <tr className={selected ? 'current-row' : ''}>
      <td>
        <TrackPlayButton track={track} player={player} className="row-play">
          <span className="row-number">
            {selected && player.isPlaying ? <AudioLines size={17} /> : index + 1}
          </span>
          <span className="row-play-icon"><TrackPlaybackIcon selected={selected} player={player} size={16} /></span>
        </TrackPlayButton>
      </td>
      <td>
        <TrackPlayButton track={track} player={player} className="track-title-cell">
          {library.selectedAlbum ? (
            <span className="track-play-mark" aria-hidden="true">
              <TrackPlaybackIcon selected={selected} player={player} size={20} />
            </span>
          ) : <Artwork track={track} small />}
          <span><strong>{trackLabel(track)}</strong><small title={subtitle}>{subtitle}</small></span>
        </TrackPlayButton>
        {!library.selectedAlbum && (
          <AppLink className="album-link mobile-album-link" href={albumPath(track.albumId)}>
            {track.albumTitle || 'Untitled album'}
          </AppLink>
        )}
      </td>
      {!library.selectedAlbum && (
        <td className="collection-column">
          <AppLink className="album-link" title={track.albumTitle} href={albumPath(track.albumId)}>
            {track.albumTitle || 'Untitled album'}
          </AppLink>
        </td>
      )}
      <td className="like-column">
        <IconButton
          icon={Heart} label={`${liked ? 'Unlike' : 'Like'} ${trackLabel(track)}`}
          active={liked} aria-pressed={liked} onClick={() => library.toggleLike(track)}
        />
      </td>
      <td className="duration-column">{duration != null ? timeLabel(duration) : '—'}</td>
    </tr>
  )
}

function LibraryContent({ library, player }) {
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
    <div className="track-table-wrap">
      <table className="table track-table">
        <thead>
          <tr>
            <th className="number-column">#</th><th>Title</th>
            {!selectedAlbum && <th className="collection-column">Album</th>}
            <th className="like-column"><span className="sr-only">Favorite</span></th>
            <th className="duration-column"><Clock3 size={16} aria-label="Duration" /></th>
          </tr>
        </thead>
        <tbody>
          {visibleTracks.map((track, index) => (
            <TrackRow key={trackKey(track)} track={track} index={index} player={player} library={library} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function TrackLibrary({ library, player, libraryRef }) {
  const { loading, error, visibleTracks, likedOnly, selectedAlbum, refresh } = library
  const title = selectedAlbum ? 'Tracks' : likedOnly ? 'Liked Songs' : 'All tracks'
  const countLabel = `${visibleTracks.length} ${visibleTracks.length === 1 ? 'track' : 'tracks'} in your collection`

  return (
    <section id="all-tracks" ref={libraryRef} aria-labelledby="library-title" className="library-section">
      <div className="section-heading library-heading">
        <div>
          <h2 id="library-title">{title}</h2>
          <p>{loading ? 'Finding your music…' : countLabel}</p>
        </div>
        <div className="library-actions">
          <button
            className="btn play-all" disabled={loading || !!error || !visibleTracks.length}
            onClick={() => { void player.startTrack(visibleTracks[0]) }}
          >
            <Play size={17} fill="currentColor" />Play all
          </button>
          <IconButton icon={RefreshCw} label="Refresh tracks" disabled={loading} onClick={refresh} />
        </div>
      </div>
      {player.error && (
        <div className="playback-error alert" role="alert">
          <CircleAlert size={19} /><span>{player.error}</span>
          <button className="text-button" onClick={() => { void player.startTrack(player.currentTrack, player.position) }}>
            Retry
          </button>
        </div>
      )}
      <LibraryContent library={library} player={player} />
    </section>
  )
}
