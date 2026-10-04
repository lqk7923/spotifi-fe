export function albumPath(albumId) {
  return `/album/${encodeURIComponent(albumId)}`
}

export function resolveRoute(pathname) {
  if (pathname === '/') return { page: 'home' }
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

export function navigate(href) {
  const url = new URL(href, window.location.origin)
  if (url.href === window.location.href) return
  window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
