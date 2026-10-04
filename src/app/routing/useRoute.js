import { useSyncExternalStore } from 'react'
import { resolveRoute } from './navigation.js'

function subscribe(onChange) {
  window.addEventListener('popstate', onChange)
  return () => window.removeEventListener('popstate', onChange)
}

function getPathname() {
  return window.location.pathname
}

export default function useRoute() {
  return resolveRoute(useSyncExternalStore(subscribe, getPathname))
}
