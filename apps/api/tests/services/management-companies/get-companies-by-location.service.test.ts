import { describe, it, expect, beforeEach } from 'bun:test'
import type { TManagementCompany } from '@packages/domain'
import { GetCompaniesByLocationService } from '@src/services/management-companies'

type TMockRepository = {
  getByLocationId: (locationId: string) => Promise<TManagementCompany[]>
}

describe('GetCompaniesByLocationService', function () {
  let service: GetCompaniesByLocationService
  let mockRepository: TMockRepository

  const locationId = '550e8400-e29b-41d4-a716-446655440010'

  const mockCompanies: TManagementCompany[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Administradora ABC',
      legalName: 'Administradora ABC C.A.',
      taxIdType: 'J',
      taxIdNumber: '12345678-9',
      email: 'contact@abc.com',
      phoneCountryCode: '+58',
      phone: '2121234567',
      website: 'https://abc.com',
      address: 'Caracas, Venezuela',
      locationId,
      isActive: true,
      logoUrl: null,
      metadata: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Administradora XYZ',
      legalName: 'Administradora XYZ C.A.',
      taxIdType: 'J',
      taxIdNumber: '87654321-0',
      email: 'contact@xyz.com',
      phoneCountryCode: '+58',
      phone: '2127654321',
      website: 'https://xyz.com',
      address: 'Caracas, Venezuela',
      locationId,
      isActive: true,
      logoUrl: null,
      metadata: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByLocationId: async function (locId: string) {
        return mockCompanies.filter(function (c) {
          return c.locationId === locId
        })
      },
    }
    service = new GetCompaniesByLocationService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all companies for a location', async function () {
      const result = await service.execute({ locationId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(c => c.locationId === locationId)).toBe(true)
      }
    })

    it('should return empty array when location has no companies', async function () {
      const result = await service.execute({ locationId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
