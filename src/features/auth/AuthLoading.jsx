import './AuthLoading.css'

export default function AuthLoading() {
  return (
    <main className="auth-loading-screen" role="status" aria-label="Signing in to Spotifi" aria-busy="true">
      <div className="auth-loading-spinner" aria-hidden="true">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" draggable="false" />
      </div>
    </main>
  )
}
