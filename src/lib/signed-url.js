// Leave a small renewal window, including for backends configured with a 1s TTL.
export function isSignedUrlFresh({ signedAt, expiresAt }, now = Date.now()) {
  if (!Number.isFinite(expiresAt)) return now - signedAt < 110_000
  const margin = Math.min(10_000, Math.max(0, expiresAt - signedAt) / 10)
  return now < expiresAt - margin
}

export function playbackSource(value) {
  const signedAt = Date.now()
  // String providers are used by the standalone benchmark and injected fixtures.
  if (typeof value === 'string') return { url: value, signedAt, expiresAt: signedAt + 120_000 }
  return { url: value.audioUrl, signedAt, expiresAt: Date.parse(value.expiresAt) }
}
