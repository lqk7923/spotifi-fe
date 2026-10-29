import './AuthLoading.css'

export default function AuthLoading() {
  return (
    <main className="auth-loading-screen" role="status" aria-label="Signing in to Spotifi" aria-busy="true">
      <svg className="auth-loading-spinner" viewBox="0 0 104 104" aria-hidden="true" focusable="false">
        <circle className="auth-loading-arc" cx="52" cy="52" r="44" pathLength="100" />
      </svg>
    </main>
  )
}
