import assert from 'node:assert/strict'
import { test } from 'node:test'
import { percentile, summarize } from '../benchmarks/statistics.js'

test('percentiles use nearest rank without mutating raw samples', () => {
  const values = [40, 10, 30, 20]
  assert.equal(percentile(values, 0.5), 20)
  assert.equal(percentile(values, 0.95), 40)
  assert.equal(percentile([], 0.5), null)
  assert.deepEqual(values, [40, 10, 30, 20])
})

test('summary excludes warm-up and failed latencies while reporting failures and cache hit count', () => {
  const samples = [
    { mode: 'ready', warmup: true, status: 'ok', startupMs: 999 },
    { mode: 'ready', warmup: false, status: 'ok', startupMs: 20, sourceMs: 5,
      preparationMs: 200, cached: true, waitingEvents: 0, completedPrefixBytes: 100 },
    { mode: 'ready', warmup: false, status: 'error', startupMs: 999, completedPrefixBytes: 50 },
    { mode: 'native', warmup: false, status: 'ok', startupMs: 100 },
  ]
  const result = summarize(samples, 'ready')
  assert.equal(result.total, 2)
  assert.equal(result.successes, 1)
  assert.equal(result.failures, 1)
  assert.equal(result.startupP50Ms, 20)
  assert.equal(result.cacheHits, 1)
  assert.equal(result.completedPrefixBytes, 150)
})
