import { auth } from './keycloak.js'

export const apiBase = (import.meta.env?.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '').replace(/\/track$/, '')

async function apiError(response, fallback) {
  const body = await response.json().catch(() => null)
  const error = new Error(typeof body?.message === 'string' && body.message.trim() ? body.message : fallback)
  error.status = response.status
  if (typeof body?.code === 'string') error.code = body.code
  return error
}

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
        throw await apiError(response, message)
      }
      return response
    }
  }
}

export const apiRequest = createApiClient()

// Only the paginated track list is public; track/album details require a token.
export function createCatalogClient({ session = auth, baseUrl = apiBase, fetcher = (...args) => fetch(...args) } = {}) {
  const authenticatedRequest = createApiClient({ session, baseUrl, fetcher })
  return async function requestCatalog(path, signal) {
    if (!/^\/tracks(?:\?(?:page=\d+&size=\d+))?$/.test(path)) {
      throw new Error('Expected a public catalog metadata path.')
    }
    if (session.getSnapshot().status === 'authenticated') return authenticatedRequest(path, signal)
    const requestSignal = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000)
    requestSignal.throwIfAborted()
    const response = await fetcher(`${baseUrl}${path}`, {
      cache: 'no-store', credentials: 'omit', signal: requestSignal,
    })
    if (!response.ok) {
      throw await apiError(response, [401, 403].includes(response.status)
        ? 'The music server has not enabled public catalog access yet.'
        : `The music server returned an error (${response.status}). Please try again.`)
    }
    return response
  }
}

export const catalogRequest = createCatalogClient()
