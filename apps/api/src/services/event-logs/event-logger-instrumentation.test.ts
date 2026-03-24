import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { EventLogger } from '@packages/services'
import { GenerateMissingQuotaService } from '../quotas/generate-missing-quota.service'
import { AdjustQuotaService } from '../quota-adjustments/adjust-quota.service'
import { ProcessWebhookService } from '../webhooks/process-webhook.service'

// ─── Shared mock EventLogger ────────────────────────────────────────────────

const mockEventLogRepo = {
  create: mock(() => Promise.resolve({ id: 'log-1' })),
}

function createEventLogger() {
  return new EventLogger(mockEventLogRepo as never)
}

// ─── GenerateMissingQuotaService ────────────────────────────────────────────

describe('GenerateMissingQuotaService instrumentation', () => {
  beforeEach(() => mockEventLogRepo.create.mockClear())

  it('should log quota.generated on success', async () => {
    const mockConcepts = {
      getById: mock(() => ({
        id: 'c1',
        isActive: true,
        condominiumId: 'cond1',
        issueDay: 1,
        dueDay: 28,
        currencyId: 'cur1',
      })),
    }
    const mockAssignments = {
      listByConceptId: mock(() => [
        {
          scopeType: 'unit',
          unitId: 'u1',
          buildingId: null,
          amount: '100',
          distributionMethod: 'fixed_per_unit',
        },
      ]),
    }
    const mockUnits = {
      getById: mock(() => ({
        id: 'u1',
        buildingId: 'b1',
        aliquotPercentage: '50',
        isActive: true,
      })),
    }
    const mockQuotas = {
      getByUnitConceptAndPeriod: mock(() => null),
      create: mock(() => ({
        id: 'q1',
        baseAmount: '100',
        periodMonth: 3,
        periodYear: 2026,
        createdBy: 'user1',
      })),
      withTx: mock(function (this: unknown) {
        return this
      }),
    }
    const mockDb = { transaction: mock(async (fn: (tx: unknown) => Promise<unknown>) => fn({})) }
    const eventLogger = createEventLogger()

    const service = new GenerateMissingQuotaService(
      mockDb as never,
      mockConcepts as never,
      mockAssignments as never,
      mockUnits as never,
      mockQuotas as never,
      eventLogger
    )

    const result = await service.execute({
      unitId: 'u1',
      paymentConceptId: 'c1',
      periodYear: 2026,
      periodMonth: 3,
      generatedBy: 'user1',
    })

    expect(result.success).toBe(true)
    expect(mockEventLogRepo.create).toHaveBeenCalledTimes(1)
    const call = (
      mockEventLogRepo.create.mock.calls as unknown as Record<string, unknown>[][]
    )[0]![0]!
    expect(call.event).toBe('quota.generated')
    expect(call.category).toBe('quota')
    expect(call.level).toBe('info')
    expect(call.result).toBe('success')
    expect(call.entityType).toBe('quota')
    expect(call.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('should log quota.generation.failed on failure', async () => {
    const mockConcepts = { getById: mock(() => null) }
    const mockDb = { transaction: mock(async (fn: (tx: unknown) => Promise<unknown>) => fn({})) }
    const eventLogger = createEventLogger()

    const service = new GenerateMissingQuotaService(
      mockDb as never,
      mockConcepts as never,
      {} as never,
      {} as never,
      {} as never,
      eventLogger
    )

    const result = await service.execute({
      unitId: 'u1',
      paymentConceptId: 'c1',
      periodYear: 2026,
      periodMonth: 3,
      generatedBy: 'user1',
    })

    expect(result.success).toBe(false)
    expect(mockEventLogRepo.create).toHaveBeenCalledTimes(1)
    const call = (
      mockEventLogRepo.create.mock.calls as unknown as Record<string, unknown>[][]
    )[0]![0]!
    expect(call.event).toBe('quota.generation.failed')
    expect(call.level).toBe('error')
    expect(call.result).toBe('failure')
    expect(call.errorCode).toBe('NOT_FOUND')
  })
})

// ─── AdjustQuotaService ─────────────────────────────────────────────────────

describe('AdjustQuotaService instrumentation', () => {
  beforeEach(() => mockEventLogRepo.create.mockClear())

  it('should log quota.adjusted on success', async () => {
    const mockQuotas = {
      getById: mock(() => ({
        id: 'q1',
        baseAmount: '100',
        adjustmentsTotal: '0',
        paidAmount: '0',
        interestAmount: '0',
        status: 'pending',
      })),
      update: mock(() => undefined),
      withTx: mock(function (this: unknown) {
        return this
      }),
    }
    const mockAdjustments = {
      create: mock(() => ({ id: 'adj1', quotaId: 'q1' })),
      withTx: mock(function (this: unknown) {
        return this
      }),
    }
    const mockDb = { transaction: mock(async (fn: (tx: unknown) => Promise<unknown>) => fn({})) }
    const eventLogger = createEventLogger()

    const service = new AdjustQuotaService(
      mockDb as never,
      mockQuotas as never,
      mockAdjustments as never,
      eventLogger
    )

    const result = await service.execute({
      quotaId: 'q1',
      newAmount: '80',
      adjustmentType: 'discount',
      reason: 'Pronto pago descuento',
      adjustedByUserId: 'admin1',
    })

    expect(result.success).toBe(true)
    expect(mockEventLogRepo.create).toHaveBeenCalledTimes(1)
    const call = (
      mockEventLogRepo.create.mock.calls as unknown as Record<string, unknown>[][]
    )[0]![0]!
    expect(call.event).toBe('quota.adjusted')
    expect(call.category).toBe('quota')
    expect(call.level).toBe('info')
    expect(call.entityId).toBe('q1')
  })

  it('should log quota.adjust.failed on failure', async () => {
    const mockQuotas = { getById: mock(() => null) }
    const mockDb = { transaction: mock(async (fn: (tx: unknown) => Promise<unknown>) => fn({})) }
    const eventLogger = createEventLogger()

    const service = new AdjustQuotaService(
      mockDb as never,
      mockQuotas as never,
      {} as never,
      eventLogger
    )

    const result = await service.execute({
      quotaId: 'q-not-found',
      newAmount: '80',
      adjustmentType: 'discount',
      reason: 'Some reason here',
      adjustedByUserId: 'admin1',
    })

    expect(result.success).toBe(false)
    expect(mockEventLogRepo.create).toHaveBeenCalledTimes(1)
    const call = (
      mockEventLogRepo.create.mock.calls as unknown as Record<string, unknown>[][]
    )[0]![0]!
    expect(call.event).toBe('quota.adjust.failed')
    expect(call.level).toBe('error')
    expect(call.errorCode).toBe('NOT_FOUND')
  })
})

// ─── ProcessWebhookService ──────────────────────────────────────────────────

describe('ProcessWebhookService instrumentation', () => {
  beforeEach(() => mockEventLogRepo.create.mockClear())

  it('should log gateway.webhook.failed on unknown gateway', async () => {
    const mockGatewayManager = { hasAdapter: mock(() => false) }
    const mockDb = { transaction: mock(async (fn: (tx: unknown) => Promise<unknown>) => fn({})) }
    const eventLogger = createEventLogger()

    const service = new ProcessWebhookService(
      mockDb as never,
      mockGatewayManager as never,
      {} as never,
      {} as never,
      {} as never,
      undefined,
      undefined,
      eventLogger
    )

    const result = await service.execute({
      gatewayType: 'unknown_gw' as never,
      headers: {},
      body: {},
      rawBody: '{}',
    })

    expect(result.success).toBe(false)
    expect(mockEventLogRepo.create).toHaveBeenCalledTimes(1)
    const call = (
      mockEventLogRepo.create.mock.calls as unknown as Record<string, unknown>[][]
    )[0]![0]!
    expect(call.event).toBe('gateway.webhook.failed')
    expect(call.level).toBe('error')
    expect(call.source).toBe('webhook')
    expect(call.errorCode).toBe('BAD_REQUEST')
  })
})
