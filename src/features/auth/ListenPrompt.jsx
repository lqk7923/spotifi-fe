import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import Artwork from '../../components/music/Artwork.jsx'
import useBannerColor from '../../components/music/useBannerColor.js'
import { auth } from '../../services/keycloak.js'
import './ListenPrompt.css'

export default function ListenPrompt({ track, onClose }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const bannerColor = useBannerColor(track)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return createPortal(
    <dialog ref={dialogRef} className="listen-prompt" aria-labelledby={titleId}
      style={{ '--listen-prompt-color': bannerColor }}
      onClose={() => { if (!dialogRef.current?.open) onClose() }}
      onClick={event => { if (event.target === event.currentTarget) dialogRef.current.close() }}>
      <div className="listen-prompt-content">
        <button type="button" className="listen-prompt-close" aria-label="Close sign-in prompt" onClick={() => dialogRef.current.close()}>
          <X size={24} aria-hidden="true" />
        </button>
        <div className="listen-prompt-cover"><Artwork track={track} /></div>
        <div className="listen-prompt-copy">
          <h2 id={titleId}>Start listening with a free Spotifi account</h2>
          <button type="button" className="listen-prompt-signup" onClick={() => void auth.register()}>Sign up free</button>
          <p>Already have an account? <button type="button" className="listen-prompt-login" onClick={() => void auth.login()}>Log in</button></p>
        </div>
      </div>
    </dialog>, document.body,
  )
}
