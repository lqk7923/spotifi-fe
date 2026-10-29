import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAuthSession } from '../src/services/auth-session.js'
import { createApiClient } from '../src/services/api-client.js'
import { keycloakConfig } from '../src/services/keycloak.js'

function setup(overrides = {}, navigation = {}) {
  const events = []
  const adapter = {
    authenticated: true, token: 'access-token',
    idToken: 'never-send-id-token', refreshToken: 'never-send-refresh-token',
    tokenParsed: { sub: 'user-1', iss: 'https://auth.example/realms/music', preferred_username: 'listener' },
    async init(options) { events.push(['init', options]); adapter.loginRequired = options.onLoad === 'login-required'; return true },
    async updateToken(validity) { events.push(['refresh', validity]) },
    clearToken() {
      events.push(['clear'])
      adapter.token = undefined
      adapter.onAuthLogout?.()
      if (adapter.loginRequired) void adapter.login()
    },
    async login(options) { events.push(['login', options]) },
    async register(options) { events.push(['register', options]) },
    async logout(options) { events.push(['logout', options, adapter.idToken]) },
    ...overrides,
  }
  const session = createAuthSession(() => adapter, () => 'https://web.example/album/id', undefined, navigation)
  return { session, adapter, events }
}

test('requires all three public Keycloak settings and never substitutes the API client ID', () => {
  assert.throws(() => keycloakConfig(), /VITE_KEYCLOAK_URL/)
  assert.throws(() => keycloakConfig({ VITE_KEYCLOAK_URL: 'https://auth.example', VITE_KEYCLOAK_REALM: 'music' }), /WEB_CLIENT_ID/)
  assert.deepEqual(keycloakConfig({
    VITE_KEYCLOAK_URL: ' https://auth.example ', VITE_KEYCLOAK_REALM: 'music', VITE_KEYCLOAK_WEB_CLIENT_ID: 'web',
  }), { url: 'https://auth.example', realm: 'music', clientId: 'web' })
})

test('checks SSO silently once with code flow and PKCE before protected requests', async () => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  const { session, events } = setup({ async init(options) { events.push(['init', options]); await gate; return true } })
  const first = session.initialize()
  assert.equal(session.initialize(), first)
  const request = createApiClient({ session, fetcher: async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer access-token')
    events.push(['fetch'])
    return Response.json([])
  } })
  const pending = request('/tracks?page=0&size=20')
  assert.equal(events.length, 1)
  release()
  await pending
  assert.deepEqual(events, [
    ['init', { onLoad: 'check-sso', flow: 'standard', pkceMethod: 'S256',
      silentCheckSsoRedirectUri: 'https://web.example/silent-check-sso.html', silentCheckSsoFallback: false }],
    ['refresh', 30], ['fetch'],
  ])
  assert.equal(session.getSnapshot().user.name, 'listener')
  assert.equal('token' in session.getSnapshot(), false)
})

test('refreshes expiring tokens and reads the latest access token on every request', async () => {
  const { session, adapter, events } = setup()
  const headers = []
  adapter.updateToken = async validity => {
    events.push(['refresh', validity])
    adapter.token = `fresh-${headers.length}`
  }
  const request = createApiClient({ session, fetcher: async (_url, options) => {
    headers.push(options.headers.Authorization)
    assert.equal(options.credentials, 'omit')
    return Response.json([])
  } })
  await request('/tracks?page=0&size=20')
  await request('/albums/id/tracks')
  assert.deepEqual(headers, ['Bearer fresh-0', 'Bearer fresh-1'])
})

test('401 forces one refresh and retries once using the refreshed token', async () => {
  const { session, adapter, events } = setup()
  adapter.updateToken = async validity => {
    events.push(['refresh', validity])
    if (validity === -1) adapter.token = 'new-access-token'
  }
  const headers = []
  const request = createApiClient({ session, fetcher: async (_url, options) => {
    headers.push(options.headers.Authorization)
    return new Response(null, { status: headers.length === 1 ? 401 : 200 })
  } })
  await request('/tracks?page=0&size=20')
  assert.deepEqual(headers, ['Bearer access-token', 'Bearer new-access-token'])
  assert.deepEqual(events.filter(event => event[0] === 'refresh'), [['refresh', 30], ['refresh', -1]])
})

test('a second 401 reports an authentication error and stops retrying', async () => {
  const { session, events } = setup()
  let calls = 0
  const request = createApiClient({ session, fetcher: async () => { calls++; return new Response(null, { status: 401 }) } })
  await assert.rejects(request('/tracks?page=0&size=20'), error => error.status === 401 && /Authentication failed/.test(error.message))
  assert.equal(calls, 2)
  assert.equal(events.filter(event => event[0] === 'refresh').length, 2)
})

test('403 reports insufficient permission without forcing refresh or retrying', async () => {
  const { session, events } = setup()
  let calls = 0
  const request = createApiClient({ session, fetcher: async () => { calls++; return new Response(null, { status: 403 }) } })
  await assert.rejects(request('/tracks?page=0&size=20'), error => error.status === 403 && /permission/.test(error.message))
  assert.equal(calls, 1)
  assert.deepEqual(events.filter(event => event[0] === 'refresh'), [['refresh', 30]])
})

test('API failures expose the documented code, message and HTTP status', async () => {
  for (const [status, code, message] of [
    [400, 'BAD_REQUEST', 'Invalid request.'],
    [401, 'UNAUTHORIZED', 'Authentication is required'],
    [403, 'FORBIDDEN', 'Access is denied'],
    [404, 'RESOURCE_NOT_FOUND', 'Album not found'],
    [500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred'],
  ]) {
    const request = createApiClient({ session: { getAccessToken: async () => 'token' },
      fetcher: async () => Response.json({ code, message }, { status }) })
    await assert.rejects(request('/albums/id'), error =>
      error.status === status && error.code === code && error.message === message)
  }
})

test('failed initial or forced refresh removes private state and prevents further requests', async () => {
  for (const failAt of [30, -1]) {
    const { session, events } = setup({ async updateToken(validity) { if (validity === failAt) throw new Error('Expired') } })
    let calls = 0
    const request = createApiClient({ session, fetcher: async () => { calls++; return new Response(null, { status: 401 }) } })
    await assert.rejects(request('/tracks?page=0&size=20'), /log in again/)
    assert.equal(calls, failAt === 30 ? 0 : 1)
    assert.equal(session.getSnapshot().status, 'signed-out')
    assert.equal(session.getSnapshot().user, null)
    assert.ok(events.some(event => event[0] === 'clear'))
    assert.equal(events.some(event => event[0] === 'login'), false)
    await assert.rejects(request('/tracks?page=0&size=20'), /log in again/)
    assert.equal(calls, failAt === 30 ? 0 : 1)
  }
})

test('missing tokens never produce Bearer undefined', async () => {
  const request = createApiClient({ session: { async getAccessToken() {} }, fetcher: () => assert.fail('Must not fetch') })
  await assert.rejects(request('/tracks?page=0&size=20'), /log in/)
  const { session } = setup({ token: undefined })
  await session.initialize()
  assert.equal(session.getSnapshot().status, 'signed-out')
})

test('canceled requests do not retry after refresh or send a backend request', async () => {
  const controller = new AbortController()
  const request = createApiClient({ session: { async getAccessToken() { controller.abort(); return 'token' } },
    fetcher: () => assert.fail('Aborted request must not fetch') })
  await assert.rejects(request('/tracks?page=0&size=20', controller.signal), { name: 'AbortError' })
})

test('presigned and protocol-relative URLs are refused by the backend API client', async () => {
  const request = createApiClient({ session: { getAccessToken: () => assert.fail('No token for external URL') } })
  await assert.rejects(request('https://r2.example/audio?signature=abc'), /relative backend/)
  await assert.rejects(request('//r2.example/audio'), /relative backend/)
})

test('login and registration use the SDK and preserve the current page', async () => {
  const { session, events } = setup()
  await session.login()
  await session.register()
  assert.deepEqual(events.slice(-2), [
    ['login', { redirectUri: 'https://web.example/album/id' }],
    ['register', { redirectUri: 'https://web.example/album/id' }],
  ])
})

test('logout clears user state before awaiting SDK logout and blocks in-flight refresh', async () => {
  let finishLogout
  let finishRefresh
  const logoutGate = new Promise(resolve => { finishLogout = resolve })
  const refreshGate = new Promise(resolve => { finishRefresh = resolve })
  const { session, adapter, events } = setup({
    async logout() { assert.equal(adapter.idToken, 'never-send-id-token'); await logoutGate },
    async updateToken() { await refreshGate },
  })
  await session.initialize()
  const pendingToken = session.getAccessToken()
  await Promise.resolve()
  const pendingLogout = session.logout()
  assert.equal(session.getSnapshot().user, null)
  assert.equal(session.getSnapshot().status, 'signed-out')
  finishRefresh()
  await assert.rejects(pendingToken, /log in again/)
  finishLogout()
  await pendingLogout
  assert.ok(events.some(event => event[0] === 'clear'))
})

test('remote logout notifies subscribers and removes user information', async () => {
  const { session, adapter } = setup()
  let updates = 0
  const unsubscribe = session.subscribe(() => updates++)
  await session.initialize()
  adapter.onAuthLogout()
  assert.equal(updates, 2)
  assert.equal(session.getSnapshot().user, null)
  unsubscribe()
})

test('explicit logout ends the Keycloak session before returning to the login entry', async () => {
  const { session, events } = setup({}, { logoutRedirectUri: () => 'https://web.example/login' })
  await session.initialize()
  await session.logout()
  assert.deepEqual(events.slice(-2), [
    ['logout', { redirectUri: 'https://web.example/login' }, 'never-send-id-token'],
    ['clear'],
  ])
  assert.equal(events.some(event => event[0] === 'login'), false)
})

test('login entry opens Keycloak and keeps the loading screen until authentication finishes', async () => {
  let finishInit
  const gate = new Promise(resolve => { finishInit = resolve })
  const { session, adapter, events } = setup({ async init(options) {
    events.push(['init', options])
    adapter.loginRequired = options.onLoad === 'login-required'
    await gate
    return true
  } }, { loginOnLoad: () => true })
  assert.equal(session.getSnapshot().status, 'redirecting')
  const pending = session.initialize()
  assert.equal(session.getSnapshot().status, 'redirecting')
  assert.equal(session.getSnapshot().user, null)
  assert.equal(events[0][1].onLoad, 'login-required')
  assert.equal(events[0][1].pkceMethod, 'S256')
  assert.equal(events[0][1].redirectUri, 'https://web.example/album/id')
  finishInit()
  await pending
  assert.equal(session.getSnapshot().status, 'authenticated')
  adapter.onAuthLogout()
  assert.equal(session.getSnapshot().status, 'signed-out')
  assert.equal(adapter.loginRequired, false)
  assert.equal(events.some(event => event[0] === 'login'), false)
})

test('failed SDK logout clears tokens and offers retry without automatically logging in again', async () => {
  const { session, adapter, events } = setup({ async logout() { throw new Error('Offline') } })
  await session.initialize()
  await session.logout()
  assert.equal(session.getSnapshot().user, null)
  assert.equal(session.getSnapshot().logoutFailed, true)
  assert.equal(adapter.token, undefined)
  assert.equal(events.some(event => event[0] === 'login'), false)
})

test('different accounts have different persisted likes keys', async () => {
  const first = setup()
  const second = setup({ tokenParsed: { sub: 'user-2', iss: 'https://auth.example/realms/music' } })
  await Promise.all([first.session.initialize(), second.session.initialize()])
  assert.notEqual(first.session.getSnapshot().user.storageKey, second.session.getSnapshot().user.storageKey)
})

test('configuration/init failures expose no user or protected access', async () => {
  const session = createAuthSession(() => keycloakConfig(), () => '')
  await session.initialize()
  assert.equal(session.getSnapshot().status, 'error')
  assert.match(session.getSnapshot().error, /VITE_KEYCLOAK_URL/)
  assert.equal(session.getSnapshot().user, null)
  await assert.rejects(session.getAccessToken(), /log in again/)
})

test('an anonymous SSO check stays signed out without login, refresh, or a session-expired error', async () => {
  const { session, events } = setup({ authenticated: false, token: undefined,
    async init(options) { events.push(['init', options]); return false } })
  await session.initialize()
  assert.equal(session.getSnapshot().status, 'signed-out')
  assert.equal(session.getSnapshot().error, '')
  await assert.rejects(session.getAccessToken(), /log in again/)
  assert.deepEqual(events.map(event => event[0]), ['init'])
})

test('explicit login shows the transition state and a failed redirect returns to guest browsing', async () => {
  let rejectLogin
  const loginGate = new Promise((_, reject) => { rejectLogin = reject })
  const { session } = setup({ async login() { await loginGate } })
  const pending = session.login()
  await session.initialize()
  await Promise.resolve()
  assert.equal(session.getSnapshot().status, 'redirecting')
  assert.equal(session.getSnapshot().user, null)
  rejectLogin(new Error('Offline'))
  await pending
  assert.equal(session.getSnapshot().status, 'signed-out')
  assert.match(session.getSnapshot().error, /Could not open sign-in/)
})
