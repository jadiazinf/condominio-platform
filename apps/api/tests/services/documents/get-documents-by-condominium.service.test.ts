import { describe, it, expect, beforeEach } from 'bun:test'
import type { TDocument } from '@packages/domain'
import { GetDocumentsByCondominiumService } from '@src/services/documents'

type TMockRepository = {
  getByCondominiumId: (condominiumId: string) => Promise<TDocument[]>
}

describe('GetDocumentsByCondominiumService', function () {
  let service: GetDocumentsByCondominiumService
  let mockRepository: TMockRepository

  const condominiumId = '550e8400-e29b-41d4-a716-446655440010'

  const mockDocuments: TDocument[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      documentType: 'regulation',
      title: 'Condominium Rules and Regulations',
      description: 'Official rules for all residents',
      condominiumId,
      buildingId: null,
      unitId: null,
      userId: null,
      paymentId: null,
      quotaId: null,
      expenseId: null,
      fileUrl: 'https://example.com/docs/regulations.pdf',
      fileName: 'regulations.pdf',
      fileSize: 1024000,
      fileType: 'application/pdf',
      documentDate: '2024-01-01',
      documentNumber: 'DOC-001',
      isPublic: true,
      metadata: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      documentType: 'minutes',
      title: 'Annual Assembly Minutes 2024',
      description: 'Minutes from the annual general assembly',
      condominiumId,
      buildingId: null,
      unitId: null,
      userId: null,
      paymentId: null,
      quotaId: null,
      expenseId: null,
      fileUrl: 'https://example.com/docs/minutes-2024.pdf',
      fileName: 'minutes-2024.pdf',
      fileSize: 512000,
      fileType: 'application/pdf',
      documentDate: '2024-01-15',
      documentNumber: 'DOC-002',
      isPublic: true,
      metadata: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByCondominiumId: async function (requestedCondominiumId: string) {
        return mockDocuments.filter(function (d) {
          return d.condominiumId === requestedCondominiumId
        })
      },
    }
    service = new GetDocumentsByCondominiumService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all documents for a condominium', async function () {
      const result = await service.execute({ condominiumId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(d => d.condominiumId === condominiumId)).toBe(true)
      }
    })

    it('should return empty array when condominium has no documents', async function () {
      const result = await service.execute({
        condominiumId: '550e8400-e29b-41d4-a716-446655440099',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
