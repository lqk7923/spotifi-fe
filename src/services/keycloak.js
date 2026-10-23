import Keycloak from 'keycloak-js'
import { createAuthSession } from './auth-session.js'

export function keycloakConfig(env = {}) {
  const values = {
    url: env.VITE_KEYCLOAK_URL?.trim(),
    realm: env.VITE_KEYCLOAK_REALM?.trim(),
    clientId: env.VITE_KEYCLOAK_WEB_CLIENT_ID?.trim(),
  }
  if (!values.url || !values.realm || !values.clientId) {
    const error = new Error('Set VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM and VITE_KEYCLOAK_WEB_CLIENT_ID in your environment, then restart or rebuild Spotifi.')
    error.configurationError = true
    throw error
  }
  return values
}

export const auth = createAuthSession(
  () => new Keycloak(keycloakConfig(import.meta.env)),
  () => `${window.location.origin}${window.location.pathname}${window.location.search}`,
)
