/**
 * pg-boss Client (API side) - Unit Tests
 *
 * Tests the queue constants and job option configurations.
 * Full integration with pg-boss requires a running PostgreSQL instance
 * and is covered in integration tests.
 *
 * Test coverage (6 tests):
 * - Queue names are properly defined
 * - Job options have retry limits
 * - Job options have backoff enabled
 * - Bulk generation options have 60 min expiry
 * - Notify options have 5 min expiry
 * - Queue names don't collide
 */
import { describe, it, expect } from 'bun:test'
import { QUEUES, JOB_OPTIONS } from '../../src/boss/queues'

describe('Queue Configuration', () => {
  it('defines all required queue names', () => {
    expect(QUEUES.AUTO_GENERATE).toBe('charges:auto-generate')
    expect(QUEUES.BULK_GENERATE).toBe('charges:bulk-generate')
    expect(QUEUES.CALCULATE_INTEREST).toBe('charges:calculate-interest')
    expect(QUEUES.NOTIFY).toBe('charges:notify')
  })

  it('all queue names are unique', () => {
    const values = Object.values(QUEUES)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })

  it('bulk generate job has retry configuration', () => {
    const opts = JOB_OPTIONS[QUEUES.BULK_GENERATE]
    expect(opts.retryLimit).toBe(3)
    expect(opts.retryDelay).toBe(30)
    expect(opts.retryBackoff).toBe(true)
  })

  it('bulk generate job expires in 60 minutes', () => {
    const opts = JOB_OPTIONS[QUEUES.BULK_GENERATE]
    expect(opts.expireInMinutes).toBe(60)
  })

  it('notify job has retry configuration', () => {
    const opts = JOB_OPTIONS[QUEUES.NOTIFY]
    expect(opts.retryLimit).toBe(3)
    expect(opts.retryDelay).toBe(10)
    expect(opts.retryBackoff).toBe(true)
  })

  it('notify job expires in 5 minutes', () => {
    const opts = JOB_OPTIONS[QUEUES.NOTIFY]
    expect(opts.expireInMinutes).toBe(5)
  })
})
