export function percentile(values, fraction) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]
}

export function summarize(samples, mode) {
  const trials = samples.filter((sample) => sample.mode === mode && !sample.warmup)
  const passed = trials.filter((sample) => sample.status === 'ok')
  const startup = passed.map((sample) => sample.startupMs)
  return {
    mode,
    total: trials.length,
    successes: passed.length,
    failures: trials.filter((sample) => sample.status === 'error').length,
    cancelled: trials.filter((sample) => sample.status === 'cancelled').length,
    startupP50Ms: percentile(startup, 0.5),
    startupP95Ms: percentile(startup, 0.95),
    sourceP50Ms: percentile(passed.map((sample) => sample.sourceMs), 0.5),
    preparationP50Ms: percentile(passed.map((sample) => sample.preparationMs), 0.5),
    cacheHits: passed.filter((sample) => sample.cached).length,
    duplicateSignatures: passed.filter((sample) => sample.duplicateSignature).length,
    backgroundStarts: passed.filter((sample) => sample.visibilityAtStart !== 'visible').length,
    waitingEvents: passed.reduce((total, sample) => total + sample.waitingEvents, 0),
    completedPrefixBytes: trials.reduce((total, sample) => total + sample.completedPrefixBytes, 0),
  }
}
