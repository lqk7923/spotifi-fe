import { auth } from './keycloak.js'

export const apiBase = (import.meta.env?.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '').replace(/\/track$/, '')

export function createApiClient({ session = auth, baseUrl = apiBase, fetcher = (...args) => fetch(...args) } = {}) {
  return async function request(path, signal) {
    // Accept only app-owned API paths. Presigned media URLs never enter this client.
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Expected a relative backend API path.')
    const requestSignal = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000)
    for (let attempt = 0; attempt < 2; attempt++) {
      requestSignal.throwIfAborted()
      const token = await session.getAccessToken(attempt === 1)
      requestSignal.throwIfAborted()
      if (!token) throw new Error('Please log in before accessing your music.')
      const response = await fetcher(`${baseUrl}${path}`, {
        cache: 'no-store', credentials: 'omit', signal: requestSignal,
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.status === 401 && attempt === 0) {
        await response.body?.cancel()
        continue
      }
      if (!response.ok) {
        const message = response.status === 401
          ? 'Authentication failed after refreshing your session. Please log in again or contact support.'
          : response.status === 403
            ? 'You do not have permission to access this music.'
            : `The music server returned an error (${response.status}). Please try again.`
        const error = new Error(message)
        error.status = response.status
        throw error
      }
      return response
    }
  }
}

export const apiRequest = createApiClient()
