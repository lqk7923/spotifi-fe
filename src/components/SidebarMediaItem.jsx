import AppLink from './AppLink.jsx'
import Artwork from './Artwork.jsx'

export default function SidebarMediaItem({ track, title, subtitle, href, onClick, label, current = false, className = '' }) {
  const Component = href ? AppLink : 'button'

  return (
    <Component
      className={`sidebar-media-item ${className}`}
      {...(href ? { href, 'aria-current': current ? 'page' : undefined } : { type: 'button', onClick })}
      aria-label={label}
      title={title}
    >
      <Artwork track={track} small />
      <span>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
    </Component>
  )
}
