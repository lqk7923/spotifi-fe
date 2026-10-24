export function createAuthSession(createAdapter, redirectUri,
  silentCheckSsoUri = () => new URL('/silent-check-sso.html', redirectUri()).href,
  { logoutRedirectUri = redirectUri, loginOnLoad = () => false } = {}) {
  let adapter
  let initialization
  let snapshot = { status: loginOnLoad() ? 'redirecting' : 'loading', user: null, error: '' }
  const listeners = new Set()
  const publish = (next) => {
    snapshot = next
    listeners.forEach(listener => listener())
  }
  const signedOut = (error = 'Your session has expired. Please log in again.', logoutFailed = false) => {
    publish({ status: 'signed-out', user: null, error, logoutFailed })
  }
  const sessionError = () => new Error('Your session has expired. Please log in again.')

  const session = {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => snapshot,
    initialize() {
      // Keycloak instances can only initialize once, including under React StrictMode.
      initialization ??= (async () => {
        try {
          adapter = createAdapter()
          adapter.onAuthLogout = () => {
            if (snapshot.status === 'authenticated') signedOut()
          }
          adapter.onTokenExpired = () => { void session.getAccessToken().catch(() => {}) }
          const requireLogin = loginOnLoad()
          if (requireLogin) publish({ status: 'redirecting', user: null, error: '' })
          const authenticated = await adapter.init({
            onLoad: requireLogin ? 'login-required' : 'check-sso', flow: 'standard', pkceMethod: 'S256',
            ...(requireLogin ? { redirectUri: redirectUri() } : {}),
            silentCheckSsoRedirectUri: silentCheckSsoUri(), silentCheckSsoFallback: false,
          })
          // Session expiry returns to guest browsing, including after a /login entry.
          adapter.loginRequired = false
          if (!authenticated || !adapter.token) {
            signedOut('')
            return
          }
          const claims = adapter.tokenParsed || {}
          publish({ status: 'authenticated', error: '', user: {
            id: claims.sub,
            name: claims.name || claims.preferred_username || 'Music lover',
            storageKey: `music-likes:${encodeURIComponent(claims.iss || '')}:${encodeURIComponent(claims.sub || '')}`,
          } })
        } catch (cause) {
          publish({ status: 'error', user: null,
            error: cause.configurationError ? cause.message : 'Could not connect to sign-in. Please try again.' })
        }
      })()
      return initialization
    },
    async getAccessToken(force = false) {
      await session.initialize()
      if (snapshot.status !== 'authenticated') throw sessionError()
      try {
        await adapter.updateToken(force ? -1 : 30)
        if (snapshot.status !== 'authenticated' || !adapter.authenticated || !adapter.token) throw sessionError()
        return adapter.token
      } catch {
        signedOut()
        adapter.clearToken()
        throw sessionError()
      }
    },
    async login() {
      await session.initialize()
      if (!adapter) return
      try {
        publish({ status: 'redirecting', user: null, error: '' })
        await adapter.login({ redirectUri: redirectUri() })
      } catch {
        signedOut('Could not open sign-in. Please try again.')
      }
    },
    async register() {
      await session.initialize()
      if (!adapter) return
      try {
        publish({ status: 'redirecting', user: null, error: '' })
        await adapter.register({ redirectUri: redirectUri() })
      } catch {
        signedOut('Could not open registration. Please try again.')
      }
    },
    async logout() {
      // Remove private UI immediately; retain the SDK's ID token until it builds the logout URL.
      signedOut('You have been logged out.')
      try {
        await adapter?.logout({ redirectUri: logoutRedirectUri() })
      } catch {
        signedOut('Signed out locally. Could not end the Keycloak session. Please retry logging out.', true)
      } finally {
        adapter?.clearToken()
      }
    },
  }
  return session
}
