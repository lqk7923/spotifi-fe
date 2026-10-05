import useCover from './useCover.js'

export default function Artwork({ track, small = false }) {
  const { src, loading } = useCover(track)

  return (
    <div
      className={`track-art ${small ? 'track-art-small' : ''} ${loading ? 'track-art-loading' : ''}`}
      aria-hidden="true"
    >
      {src && <img key={src} className="cover-image" src={src} alt=""
        onError={event => { event.currentTarget.hidden = true }} />}
    </div>
  )
}
