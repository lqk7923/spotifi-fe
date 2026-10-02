import { AudioLines } from 'lucide-react'

const palettes = [
  ['#6b3bbd', '#b098e8'], ['#0b716a', '#88d7b2'], ['#a84832', '#edba86'],
  ['#264b97', '#90b8db'], ['#982c65', '#e993b9'], ['#807227', '#d9d58c'],
]

export default function Artwork({ track, small = false }) {
  const hash = [...(track?.trackId || 'music')]
    .reduce((sum, letter) => sum + letter.charCodeAt(0), 0)
  const colors = palettes[hash % palettes.length]

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
        {track?.trackId.slice(0, 4).toUpperCase() || 'MUSIC'}
      </span>
    </div>
  )
}
