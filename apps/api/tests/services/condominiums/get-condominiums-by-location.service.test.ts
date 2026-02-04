import { describe, it, expect, beforeEach } from 'bun:test'
import type { TCondominium } from '@packages/domain'
import { GetCondominiumsByLocationService } from '@src/services/condominiums'

type TMockRepository = {
  getByLocationId: (locationId: string, includeInactive?: boolean) => Promise<TCondominium[]>
}

describe('GetCondominiumsByLocationService', function () {
  let service: GetCondominiumsByLocationService
  let mockRepository: TMockRepository

  const locationId = '550e8400-e29b-41d4-a716-446655440020'

  const mockCondominiums: TCondominium[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Test Condominium 1',
      code: 'CONDO-001',
      managementCompanyId: '550e8400-e29b-41d4-a716-446655440010',
      address: '123 Condominium Street',
      locationId,
      email: 'admin@testcondo1.com',
      phone: '+1234567890',
      phoneCountryCode: '+1',
      defaultCurrencyId: '550e8400-e29b-41d4-a716-446655440030',
      isActive: true,
      metadata: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Test Condominium 2',
      code: 'CONDO-002',
      managementCompanyId: '550e8400-e29b-41d4-a716-446655440011',
      address: '456 Condominium Street',
      locationId,
      email: 'admin@testcondo2.com',
      phone: '+0987654321',
      phoneCountryCode: '+1',
      defaultCurrencyId: '550e8400-e29b-41d4-a716-446655440030',
      isActive: true,
      metadata: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Inactive Condominium',
      code: 'CONDO-003',
      managementCompanyId: '550e8400-e29b-41d4-a716-446655440012',
      address: '789 Condominium Street',
      locationId,
      email: 'admin@testcondo3.com',
      phone: '+1122334455',
      phoneCountryCode: '+1',
      defaultCurrencyId: '550e8400-e29b-41d4-a716-446655440030',
      isActive: false,
      metadata: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByLocationId: async function (requestedLocationId: string, includeInactive?: boolean) {
        const condominiums = mockCondominiums.filter(function (c) {
          return c.locationId === requestedLocationId
        })
        if (includeInactive) {
          return condominiums
        }
        return condominiums.filter(function (c) {
          return c.isActive
        })
      },
    }
    service = new GetCondominiumsByLocationService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all active condominiums for a location', async function () {
      const result = await service.execute({ locationId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(c => c.locationId === locationId)).toBe(true)
        expect(result.data.every(c => c.isActive)).toBe(true)
      }
    })

    it('should return all condominiums including inactive when flag is set', async function () {
      const result = await service.execute({ locationId, includeInactive: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(3)
        expect(result.data.every(c => c.locationId === locationId)).toBe(true)
      }
    })

    it('should return empty array when location has no condominiums', async function () {
      const result = await service.execute({ locationId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
