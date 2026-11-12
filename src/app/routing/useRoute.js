import { useSyncExternalStore } from 'react'
import { resolveRoute } from './navigation.js'

function subscribe(onChange) {
  window.addEventListener('popstate', onChange)
  return () => window.removeEventListener('popstate', onChange)
}

function getLocation() {
  return window.location.href
}

export default function useRoute() {
  const url = new URL(useSyncExternalStore(subscribe, getLocation))
  return resolveRoute(url.pathname, url.search)
}
