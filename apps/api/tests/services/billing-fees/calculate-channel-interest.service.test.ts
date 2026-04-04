import { describe, it, expect, beforeEach } from 'bun:test'
import type { TCharge, TChargeType, TUnitLedgerEntry } from '@packages/domain'
import { CalculateChannelInterestService } from '@src/services/billing-fees/calculate-channel-interest.service'

const condominiumId = 'condo-1'
const unitId = 'unit-001'
const currencyId = 'currency-001'

interface IInterestConfig {
  interestType: string
  interestRate: string | null
  interestCalculationPeriod: string | null
  interestGracePeriodDays: number
  maxInterestCapType: string
  maxInterestCapValue: string | null
}

function makeConfig(overrides: Partial<IInterestConfig> = {}): IInterestConfig {
  return {
    interestType: 'simple',
    interestRate: '0.01', // 1% mensual
    interestCalculationPeriod: 'monthly',
    interestGracePeriodDays: 0,
    maxInterestCapType: 'none',
    maxInterestCapValue: null,
    ...overrides,
  }
}

let createdCharges: any[]
let createdEntries: any[]

describe('CalculateChannelInterestService', () => {
  let service: CalculateChannelInterestService

  beforeEach(() => {
    createdCharges = []
    createdEntries = []

    const mockChargesRepo = {
      findPendingByUnitAndCondominium: async () => [
        {
          id: 'c1', condominiumId: condominiumId, unitId, amount: '50000.00',
          balance: '50000.00', status: 'pending', isCredit: false,
          createdAt: new Date('2026-01-05'), // overdue
          periodYear: 2026, periodMonth: 1,
        } as Partial<TCharge>,
      ],
    }

    const mockChargeTypesRepo = {
      findByCategory: async () => ({
        id: 'ct-interest', condominiumId: condominiumId,
        name: 'Interés por mora', categoryId: 'cat-interest',
      } as Partial<TChargeType>),
    }

    const mockCreateChargeService = {
      execute: async (input: any) => {
        const charge = { id: `interest-${createdCharges.length + 1}`, ...input }
        createdCharges.push(charge)
        const entry = { id: `entry-${createdEntries.length + 1}`, ...input, entryType: 'debit' }
        createdEntries.push(entry)
        return { success: true, data: { charge, entry } }
      },
    }

    service = new CalculateChannelInterestService(
      mockChargesRepo as never,
      mockChargeTypesRepo as never,
      mockCreateChargeService as never,
    )
  })

  describe('simple interest', () => {
    it('should calculate 1% monthly on overdue balance', async () => {
      const config = makeConfig({ interestType: 'simple', interestRate: '0.01' })

      const result = await service.execute({
        condominiumId,
        config,
        unitId,
        calculationDate: '2026-02-05', // 1 month overdue
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // 50000 * 0.01 = 500
        expect(parseFloat(result.data.interestAmount)).toBeCloseTo(500, 0)
        expect(createdCharges.length).toBe(1)
      }
    })
  })

  describe('fixed amount interest', () => {
    it('should use the fixed rate as amount directly', async () => {
      const config = makeConfig({ interestType: 'fixed_amount', interestRate: '250.00' })

      const result = await service.execute({
        condominiumId, config, unitId, calculationDate: '2026-02-05',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.interestAmount).toBe('250.00')
      }
    })
  })

  describe('interest type none', () => {
    it('should return 0 and create no charges', async () => {
      const config = makeConfig({ interestType: 'none', interestRate: null })

      const result = await service.execute({
        condominiumId, config, unitId, calculationDate: '2026-02-05',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.interestAmount).toBe('0.00')
        expect(createdCharges.length).toBe(0)
      }
    })
  })

  describe('grace period', () => {
    it('should not charge interest within grace period', async () => {
      const config = makeConfig({
        interestType: 'simple', interestRate: '0.01',
        interestGracePeriodDays: 30,
      })

      const result = await service.execute({
        condominiumId, config, unitId,
        calculationDate: '2026-01-20', // only 15 days, within 30-day grace
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.interestAmount).toBe('0.00')
        expect(createdCharges.length).toBe(0)
      }
    })
  })

  describe('interest cap', () => {
    it('should cap interest at percentage of principal', async () => {
      const config = makeConfig({
        interestType: 'simple', interestRate: '0.10', // 10% mensual (absurdo, para test)
        maxInterestCapType: 'percentage_of_principal',
        maxInterestCapValue: '0.05', // cap at 5% of principal
      })

      const result = await service.execute({
        condominiumId, config, unitId, calculationDate: '2026-02-05',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // Without cap: 50000 * 0.10 = 5000
        // With cap: 50000 * 0.05 = 2500
        expect(parseFloat(result.data.interestAmount)).toBeLessThanOrEqual(2500)
      }
    })

    it('should cap interest at fixed amount', async () => {
      const config = makeConfig({
        interestType: 'simple', interestRate: '0.10',
        maxInterestCapType: 'fixed',
        maxInterestCapValue: '1000.00',
      })

      const result = await service.execute({
        condominiumId, config, unitId, calculationDate: '2026-02-05',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(parseFloat(result.data.interestAmount)).toBeLessThanOrEqual(1000)
      }
    })
  })

  describe('no overdue balance', () => {
    it('should return 0 when no pending charges', async () => {
      const mockChargesRepoEmpty = {
        findPendingByUnitAndCondominium: async () => [],
      }
      const svc = new CalculateChannelInterestService(
        mockChargesRepoEmpty as never,
        {} as never,
        {} as never,
      )
      const config = makeConfig()

      const result = await svc.execute({
        condominiumId, config, unitId, calculationDate: '2026-02-05',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.interestAmount).toBe('0.00')
      }
    })
  })
})
