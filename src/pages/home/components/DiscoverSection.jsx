import { trackKey } from '../../../lib/tracks.js'
import TrackCard from '../../../components/music/TrackCard.jsx'
import TrackCarousel from '../../../components/music/TrackCarousel.jsx'

export default function DiscoverSection({ library, player, onLibrary }) {
  const { loading, error, collectionTracks } = library
  if (loading || error || !collectionTracks.length) return null

  return (
    <section aria-labelledby="discover-title">
      <div className="section-heading">
        <div><h2 id="discover-title">Your music, on repeat</h2></div>
        <button className="text-button" onClick={onLibrary}>SEE ALL</button>
      </div>
      <TrackCarousel>
        {collectionTracks.slice(0, 5).map(track => (
          <TrackCard key={trackKey(track)} track={track} player={player} library={library} />
        ))}
      </TrackCarousel>
    </section>
  )
}
