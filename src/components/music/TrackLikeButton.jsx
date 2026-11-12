import { Heart } from 'lucide-react'
import { trackLabel } from '../../lib/tracks.js'
import IconButton from '../ui/IconButton.jsx'

export default function TrackLikeButton({ track, library, className }) {
  const liked = library.isLiked(track)

  return (
    <IconButton icon={Heart} className={className} active={liked} aria-pressed={liked}
      label={`Like ${trackLabel(track)}`} title={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
      disabled={library.isLikeDisabled(track)} onClick={() => { void library.toggleLike(track) }} />
  )
}
