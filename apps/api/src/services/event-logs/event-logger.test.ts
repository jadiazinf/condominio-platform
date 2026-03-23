import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { EventLogger } from '@packages/services'

const mockRepo = {
  create: mock(() => Promise.resolve({ id: 'log-1' })),
}

describe('EventLogger', () => {
  beforeEach(() => {
    mockRepo.create.mockClear()
  })

  it('should persist an event log via the repository', async () => {
    const logger = new EventLogger(mockRepo as never)

    await logger.log({
      category: 'payment',
      level: 'info',
      event: 'payment.flow.initiated',
      action: 'initiate_payment',
      message: 'Payment flow initiated for unit A-101',
      result: 'success',
      userId: 'user-1',
      entityType: 'payment',
      entityId: 'payment-1',
    })

    expect(mockRepo.create).toHaveBeenCalledTimes(1)
    const call = mockRepo.create.mock.calls[0]![0] as Record<string, unknown>
    expect(call.category).toBe('payment')
    expect(call.level).toBe('info')
    expect(call.event).toBe('payment.flow.initiated')
    expect(call.result).toBe('success')
    expect(call.userId).toBe('user-1')
    expect(call.source).toBe('api')
  })

  it('should use convenience method info() with success result', async () => {
    const logger = new EventLogger(mockRepo as never)

    await logger.info({
      category: 'receipt',
      event: 'receipt.generated',
      action: 'generate_receipt',
      message: 'Receipt generated',
    })

    expect(mockRepo.create).toHaveBeenCalledTimes(1)
    const call = mockRepo.create.mock.calls[0]![0] as Record<string, unknown>
    expect(call.level).toBe('info')
    expect(call.result).toBe('success')
  })

  it('should use convenience method error() with failure result', async () => {
    const logger = new EventLogger(mockRepo as never)

    await logger.error({
      category: 'worker',
      event: 'worker.auto_generation.failed',
      action: 'auto_generate',
      message: 'Auto generation failed',
      errorCode: 'INTERNAL_ERROR',
      errorMessage: 'Database connection lost',
    })

    expect(mockRepo.create).toHaveBeenCalledTimes(1)
    const call = mockRepo.create.mock.calls[0]![0] as Record<string, unknown>
    expect(call.level).toBe('error')
    expect(call.result).toBe('failure')
    expect(call.errorCode).toBe('INTERNAL_ERROR')
  })

  it('should use convenience method warn()', async () => {
    const logger = new EventLogger(mockRepo as never)

    await logger.warn({
      category: 'payment',
      event: 'payment.rejected',
      action: 'reject_payment',
      message: 'Payment was rejected',
      result: 'failure',
    })

    const call = mockRepo.create.mock.calls[0]![0] as Record<string, unknown>
    expect(call.level).toBe('warn')
    expect(call.result).toBe('failure')
  })

  it('should use convenience method critical()', async () => {
    const logger = new EventLogger(mockRepo as never)

    await logger.critical({
      category: 'system',
      event: 'system.database.connection_lost',
      action: 'health_check',
      message: 'Database connection lost',
    })

    const call = mockRepo.create.mock.calls[0]![0] as Record<string, unknown>
    expect(call.level).toBe('critical')
    expect(call.result).toBe('failure')
  })

  it('should apply defaults from constructor', async () => {
    const logger = new EventLogger(mockRepo as never, {
      source: 'worker',
      module: 'auto-generation.processor',
    })

    await logger.info({
      category: 'worker',
      event: 'worker.auto_generation.started',
      action: 'auto_generate',
      message: 'Started',
    })

    const call = mockRepo.create.mock.calls[0]![0] as Record<string, unknown>
    expect(call.source).toBe('worker')
    expect(call.module).toBe('auto-generation.processor')
  })

  it('should not throw when repository fails (fire-and-forget)', async () => {
    const failingRepo = {
      create: mock(() => Promise.reject(new Error('DB connection lost'))),
    }
    const logger = new EventLogger(failingRepo as never)

    // Should not throw
    await logger.info({
      category: 'payment',
      event: 'payment.flow.initiated',
      action: 'initiate_payment',
      message: 'Payment flow initiated',
    })

    expect(failingRepo.create).toHaveBeenCalledTimes(1)
  })

  it('should fill nullable fields with null when not provided', async () => {
    const logger = new EventLogger(mockRepo as never)

    await logger.log({
      category: 'system',
      event: 'system.startup',
      action: 'startup',
      message: 'System started',
      result: 'success',
    })

    const call = mockRepo.create.mock.calls[0]![0] as Record<string, unknown>
    expect(call.module).toBeNull()
    expect(call.condominiumId).toBeNull()
    expect(call.entityType).toBeNull()
    expect(call.entityId).toBeNull()
    expect(call.userId).toBeNull()
    expect(call.userRole).toBeNull()
    expect(call.errorCode).toBeNull()
    expect(call.errorMessage).toBeNull()
    expect(call.metadata).toBeNull()
    expect(call.durationMs).toBeNull()
    expect(call.ipAddress).toBeNull()
  })
})
