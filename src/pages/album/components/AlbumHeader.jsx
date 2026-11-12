import { useId, useState } from 'react'
import Artwork from '../../../components/music/Artwork.jsx'
import LikedSongsArtwork from '../../../components/music/LikedSongsArtwork.jsx'
import { albumDurationLabel, albumReleaseDate } from '../../../lib/format.js'
import { trackDurationSeconds } from '../../../lib/tracks.js'

const albumTypes = new Map([['SINGLE', 'Single'], ['EP', 'EP'], ['LP', 'LP']])

export default function AlbumHeader({ album, tracks, likedOnly, showTrackSummary }) {
  const releaseTooltipId = useId()
  const [tooltipDismissed, setTooltipDismissed] = useState(false)
  const duration = tracks.reduce((total, track) => total + (trackDurationSeconds(track) || 0), 0)
  const release = albumReleaseDate(album?.releaseDate)
  return (
    <section className="album-hero" aria-labelledby="album-title">
      <div className="album-identity">
        {likedOnly ? <LikedSongsArtwork /> : <Artwork track={album} />}
        <div className="album-details">
          <p className="album-type">{likedOnly ? 'Playlist' : albumTypes.get(album?.albumType) ?? 'Album'}</p>
          <h1 id="album-title">{likedOnly ? 'Liked Songs' : album?.title || 'Album'}</h1>
          {showTrackSummary && <p className="album-meta">
            {album?.artist && <><span className="album-author">{album.artist}</span><span aria-hidden="true"> • </span></>}
            {release && <>
              <span className="album-release" data-dismissed={tooltipDismissed}
                onMouseEnter={() => setTooltipDismissed(false)}
                onFocus={() => setTooltipDismissed(false)}
                onKeyDown={event => { if (event.key === 'Escape') setTooltipDismissed(true) }}>
                <time dateTime={release.iso} tabIndex={0} aria-describedby={releaseTooltipId}>{release.year}</time>
                <span id={releaseTooltipId} className="album-release-tooltip" role="tooltip">{release.full}</span>
              </span>
              <span aria-hidden="true"> • </span>
            </>}
            <span>{tracks.length.toLocaleString('en-US')} {tracks.length === 1 ? 'song' : 'songs'}</span>
            {duration > 0 && <><span aria-hidden="true">, </span><span className="album-total-duration">{albumDurationLabel(duration)}</span></>}
          </p>}
        </div>
      </div>
    </section>
  )
}
