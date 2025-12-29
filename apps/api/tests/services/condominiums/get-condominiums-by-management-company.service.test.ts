import { describe, it, expect, beforeEach } from 'bun:test'
import type { TCondominium } from '@packages/domain'
import { GetCondominiumsByManagementCompanyService } from '@src/services/condominiums'

type TMockRepository = {
  getByManagementCompanyId: (managementCompanyId: string, includeInactive?: boolean) => Promise<TCondominium[]>
}

describe('GetCondominiumsByManagementCompanyService', function () {
  let service: GetCondominiumsByManagementCompanyService
  let mockRepository: TMockRepository

  const managementCompanyId = '550e8400-e29b-41d4-a716-446655440010'

  const mockCondominiums: TCondominium[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Test Condominium 1',
      code: 'CONDO-001',
      managementCompanyId,
      address: '123 Condominium Street',
      locationId: '550e8400-e29b-41d4-a716-446655440020',
      email: 'admin@testcondo1.com',
      phone: '+1234567890',
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
      managementCompanyId,
      address: '456 Condominium Street',
      locationId: '550e8400-e29b-41d4-a716-446655440021',
      email: 'admin@testcondo2.com',
      phone: '+0987654321',
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
      managementCompanyId,
      address: '789 Condominium Street',
      locationId: '550e8400-e29b-41d4-a716-446655440022',
      email: 'admin@testcondo3.com',
      phone: '+1122334455',
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
      getByManagementCompanyId: async function (
        requestedManagementCompanyId: string,
        includeInactive?: boolean
      ) {
        const condominiums = mockCondominiums.filter(function (c) {
          return c.managementCompanyId === requestedManagementCompanyId
        })
        if (includeInactive) {
          return condominiums
        }
        return condominiums.filter(function (c) {
          return c.isActive
        })
      },
    }
    service = new GetCondominiumsByManagementCompanyService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all active condominiums for a management company', async function () {
      const result = await service.execute({ managementCompanyId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((c) => c.managementCompanyId === managementCompanyId)).toBe(true)
        expect(result.data.every((c) => c.isActive)).toBe(true)
      }
    })

    it('should return all condominiums including inactive when flag is set', async function () {
      const result = await service.execute({ managementCompanyId, includeInactive: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(3)
        expect(result.data.every((c) => c.managementCompanyId === managementCompanyId)).toBe(true)
      }
    })

    it('should return empty array when management company has no condominiums', async function () {
      const result = await service.execute({
        managementCompanyId: '550e8400-e29b-41d4-a716-446655440099',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
