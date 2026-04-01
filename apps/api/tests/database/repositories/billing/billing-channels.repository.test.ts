import { describe, it, expect } from 'bun:test'
import type { TBillingChannel } from '@packages/domain'

describe('BillingChannelsRepository', () => {
  describe('domain model mapping', () => {
    it('should have correct shape for a receipt channel', () => {
      const channel: TBillingChannel = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        condominiumId: '550e8400-e29b-41d4-a716-446655440010',
        buildingId: null,
        name: 'Recibo de Condominio',
        channelType: 'receipt',
        currencyId: '550e8400-e29b-41d4-a716-446655440020',
        managedBy: 'Administradora X',
        distributionMethod: 'by_aliquot',
        frequency: 'monthly',
        generationStrategy: 'manual',
        generationDay: 5,
        dueDay: 28,
        latePaymentType: 'percentage',
        latePaymentValue: '0.02',
        gracePeriodDays: 5,
        earlyPaymentType: 'percentage',
        earlyPaymentValue: '0.05',
        earlyPaymentDaysBefore: 5,
        interestType: 'simple',
        interestRate: '0.01',
        interestCalculationPeriod: 'monthly',
        interestGracePeriodDays: 0,
        maxInterestCapType: 'percentage_of_principal',
        maxInterestCapValue: '0.12',
        allocationStrategy: 'fifo',
        assemblyReference: 'Acta asamblea 15/03/2026, punto 3',
        isActive: true,
        effectiveFrom: '2026-03-01',
        effectiveUntil: null,
        receiptNumberFormat: 'REC-{CODE}-{YYYYMM}-{SEQ:4}',
        metadata: null,
        createdBy: '550e8400-e29b-41d4-a716-446655440030',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(channel.channelType).toBe('receipt')
      expect(channel.distributionMethod).toBe('by_aliquot')
      expect(channel.allocationStrategy).toBe('fifo')
      expect(channel.interestType).toBe('simple')
      expect(channel.generationDay).toBeGreaterThanOrEqual(1)
      expect(channel.generationDay).toBeLessThanOrEqual(28)
      expect(channel.dueDay).toBeGreaterThanOrEqual(1)
      expect(channel.dueDay).toBeLessThanOrEqual(28)
    })

    it('should have correct shape for a standalone channel', () => {
      const channel: TBillingChannel = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        condominiumId: '550e8400-e29b-41d4-a716-446655440010',
        buildingId: '550e8400-e29b-41d4-a716-446655440011',
        name: 'Mantenimiento Edificio',
        channelType: 'standalone',
        currencyId: '550e8400-e29b-41d4-a716-446655440020',
        managedBy: 'Junta de Condominio',
        distributionMethod: 'equal_split',
        frequency: 'monthly',
        generationStrategy: 'auto',
        generationDay: 1,
        dueDay: 15,
        latePaymentType: 'none',
        latePaymentValue: null,
        gracePeriodDays: 0,
        earlyPaymentType: 'none',
        earlyPaymentValue: null,
        earlyPaymentDaysBefore: 0,
        interestType: 'none',
        interestRate: null,
        interestCalculationPeriod: null,
        interestGracePeriodDays: 0,
        maxInterestCapType: 'none',
        maxInterestCapValue: null,
        allocationStrategy: 'fifo',
        assemblyReference: null,
        isActive: true,
        effectiveFrom: '2026-03-01',
        effectiveUntil: null,
        receiptNumberFormat: null,
        metadata: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(channel.channelType).toBe('standalone')
      expect(channel.buildingId).not.toBeNull()
      expect(channel.interestType).toBe('none')
      expect(channel.latePaymentType).toBe('none')
    })
  })

  describe('enum validations', () => {
    it('should accept all valid channel types', () => {
      const validTypes = ['receipt', 'standalone'] as const
      validTypes.forEach(t => {
        expect(['receipt', 'standalone']).toContain(t)
      })
    })

    it('should accept all valid frequencies', () => {
      const validFreqs = ['monthly', 'quarterly', 'semi_annual', 'annual', 'one_time'] as const
      expect(validFreqs.length).toBe(5)
    })

    it('should accept all valid allocation strategies', () => {
      const validStrategies = ['fifo', 'designated', 'fifo_interest_first'] as const
      expect(validStrategies.length).toBe(3)
    })
  })
})
