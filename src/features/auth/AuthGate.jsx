import { useEffect, useSyncExternalStore } from 'react'
import { auth } from '../../services/keycloak.js'
import AuthLoading from './AuthLoading.jsx'
import './AuthGate.css'

export default function AuthGate({ children }) {
  const { status, user, error, logoutFailed } = useSyncExternalStore(auth.subscribe, auth.getSnapshot)
  useEffect(() => { void auth.initialize() }, [])

  if (status === 'redirecting') {
    return <AuthLoading />
  }

  return (
    <div className="auth-content" key={user ? `account:${user.id}` : 'guest'}>
      {children}
      {(status === 'error' || logoutFailed) && (
        <aside className="auth-feedback" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => logoutFailed ? void auth.logout() : window.location.reload()}>
            {logoutFailed ? 'Retry log out' : 'Try again'}
          </button>
        </aside>
      )}
    </div>
  )
}
