export function albumPath(albumId) {
  return `/album/${encodeURIComponent(albumId)}`
}

export function resolveRoute(pathname) {
  if (pathname === '/') return { page: 'home' }
  const match = pathname.match(/^\/album\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i)
  if (match) return { page: 'album', albumId: match[1].toLowerCase() }
  return { page: 'not-found' }
}

export function navigate(href) {
  const url = new URL(href, window.location.origin)
  if (url.href === window.location.href) return
  window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
