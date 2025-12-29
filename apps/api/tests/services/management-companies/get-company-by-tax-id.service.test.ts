import { describe, it, expect, beforeEach } from 'bun:test'
import type { TManagementCompany } from '@packages/domain'
import { GetCompanyByTaxIdService } from '@src/services/management-companies'

type TMockRepository = {
  getByTaxId: (taxId: string) => Promise<TManagementCompany | null>
}

describe('GetCompanyByTaxIdService', function () {
  let service: GetCompanyByTaxIdService
  let mockRepository: TMockRepository

  const mockCompany: TManagementCompany = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Administradora ABC',
    legalName: 'Administradora ABC C.A.',
    taxId: 'J-12345678-9',
    email: 'contact@abc.com',
    phone: '+58 212 1234567',
    website: 'https://abc.com',
    address: 'Caracas, Venezuela',
    locationId: '550e8400-e29b-41d4-a716-446655440010',
    isActive: true,
    logoUrl: null,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(function () {
    mockRepository = {
      getByTaxId: async function (taxId: string) {
        if (taxId === 'J-12345678-9') {
          return mockCompany
        }
        return null
      },
    }
    service = new GetCompanyByTaxIdService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return company when found', async function () {
      const result = await service.execute({ taxId: 'J-12345678-9' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(mockCompany.id)
        expect(result.data.taxId).toBe('J-12345678-9')
        expect(result.data.name).toBe('Administradora ABC')
      }
    })

    it('should return NOT_FOUND error when company does not exist', async function () {
      const result = await service.execute({ taxId: 'J-99999999-9' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Management company not found')
      }
    })
  })
})
