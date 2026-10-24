import { useEffect, useSyncExternalStore } from 'react'
import { Music2 } from 'lucide-react'
import { auth } from '../../services/keycloak.js'
import AuthLoading from './AuthLoading.jsx'
import './AuthGate.css'

export default function AuthGate({ children }) {
  const { status, user, error, logoutFailed } = useSyncExternalStore(auth.subscribe, auth.getSnapshot)
  useEffect(() => { void auth.initialize() }, [])

  if (status === 'authenticated') return <div className="auth-content" key={user.id}>{children}</div>
  if (status === 'loading') return <AuthLoading />

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <Music2 size={42} aria-hidden="true" />
        <h1>Welcome to Spotifi</h1>
        <p role={error ? 'alert' : 'status'}>{error || 'Connecting to your account…'}</p>
        {status === 'error' ? (
          <button className="btn auth-primary" onClick={() => window.location.reload()}>Try again</button>
        ) : status === 'signed-out' && (
          <div className="auth-actions">
            {logoutFailed && <button className="btn auth-secondary" onClick={() => void auth.logout()}>Retry log out</button>}
            <button className="btn auth-primary" onClick={() => void auth.login()}>Log in</button>
            <button className="btn auth-secondary" onClick={() => void auth.register()}>Create account</button>
          </div>
        )}
      </div>
    </main>
  )
}
