export function albumPath(albumId) {
  return `/album/${encodeURIComponent(albumId)}`
}

export function searchPath(query = '') {
  return query ? `/search?${new URLSearchParams({ q: query })}` : '/search'
}

export function resolveRoute(pathname, search = '') {
  if (pathname === '/') return { page: 'home' }
  if (pathname === '/search' || pathname === '/search/') {
    return { page: 'search', query: new URLSearchParams(search).get('q') ?? '' }
  }
  const match = pathname.match(/^\/album\/([^/]+)\/?$/i)
  if (match) {
    let albumId = match[1]
    try {
      albumId = decodeURIComponent(albumId)
    } catch {
      // Preserve malformed escapes so the backend can validate the raw ID.
    }
    return { page: 'album', albumId }
  }
  return { page: 'not-found' }
}

export function navigate(href, { replace = false } = {}) {
  const url = new URL(href, window.location.origin)
  if (url.href === window.location.href) return
  const path = `${url.pathname}${url.search}${url.hash}`
  if (replace) window.history.replaceState(null, '', path)
  else window.history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
