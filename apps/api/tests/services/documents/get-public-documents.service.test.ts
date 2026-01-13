import { describe, it, expect, beforeEach } from 'bun:test'
import type { TDocument } from '@packages/domain'
import { GetPublicDocumentsService } from '@src/services/documents'

type TMockRepository = {
  getPublicDocuments: () => Promise<TDocument[]>
}

describe('GetPublicDocumentsService', function () {
  let service: GetPublicDocumentsService
  let mockRepository: TMockRepository

  const mockDocuments: TDocument[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      documentType: 'regulation',
      title: 'Condominium Rules and Regulations',
      description: 'Official rules for all residents',
      condominiumId: '550e8400-e29b-41d4-a716-446655440010',
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
      condominiumId: '550e8400-e29b-41d4-a716-446655440010',
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
      getPublicDocuments: async function () {
        return mockDocuments
      },
    }
    service = new GetPublicDocumentsService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all public documents', async function () {
      const result = await service.execute()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(d => d.isPublic === true)).toBe(true)
      }
    })

    it('should return empty array when no public documents exist', async function () {
      mockRepository.getPublicDocuments = async function () {
        return []
      }

      const result = await service.execute()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
