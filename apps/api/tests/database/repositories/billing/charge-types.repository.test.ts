import { describe, it, expect } from 'bun:test'
import type { TChargeType } from '@packages/domain'
import type { TChargeCategoryName } from '@packages/domain'

describe('ChargeTypesRepository', () => {
  const makeChargeType = (overrides: Partial<TChargeType> = {}): TChargeType => ({
    id: '550e8400-e29b-41d4-a716-446655440001',
    condominiumId: '550e8400-e29b-41d4-a716-446655440010',
    name: 'Administración',
    categoryId: '550e8400-e29b-41d4-a716-446655440020',
    sortOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

  describe('charge categories', () => {
    it('should support all charge category names', () => {
      const categories: TChargeCategoryName[] = [
        'ordinary',
        'extraordinary',
        'reserve_fund',
        'social_benefits',
        'non_common',
        'fine',
        'interest',
        'late_fee',
        'discount',
        'credit_note',
        'debit_note',
        'other',
      ]

      expect(categories.length).toBe(12)
    })

    it('should reference category by UUID', () => {
      const ct = makeChargeType({ categoryId: '550e8400-e29b-41d4-a716-446655440099' })
      expect(ct.categoryId).toBe('550e8400-e29b-41d4-a716-446655440099')
    })
  })

  describe('sort order', () => {
    it('should order charge types for receipt display', () => {
      const types = [
        makeChargeType({ name: 'Administración', sortOrder: 1 }),
        makeChargeType({ name: 'Electricidad', sortOrder: 2 }),
        makeChargeType({ name: 'Vigilancia', sortOrder: 3 }),
        makeChargeType({ name: 'Fondo Reserva', sortOrder: 10 }),
        makeChargeType({ name: 'Interés', sortOrder: 997 }),
        makeChargeType({ name: 'Recargo', sortOrder: 998 }),
        makeChargeType({ name: 'Descuento', sortOrder: 999 }),
      ]

      const sorted = [...types].sort((a, b) => a.sortOrder - b.sortOrder)
      expect(sorted[0]!.name).toBe('Administración')
      expect(sorted[sorted.length - 1]!.name).toBe('Descuento')
    })
  })
})
