import { AudioLines } from 'lucide-react'
import { artworkColors } from '../../lib/artwork.js'

export default function Artwork({ track, small = false }) {
  const colors = artworkColors(track)

  return (
    <div
      className={`track-art ${small ? 'track-art-small' : ''}`}
      aria-hidden="true"
      style={{ '--cover-start': colors[0], '--cover-end': colors[1] }}
    >
      <span className="cover-label">SOUND<br />COLLECTION</span>
      <div className="vinyl"><span /></div>
      <AudioLines className="cover-wave" />
      <span className="cover-id">
        {track?.trackId?.slice(0, 4).toUpperCase() || 'MUSIC'}
      </span>
    </div>
  )
}
