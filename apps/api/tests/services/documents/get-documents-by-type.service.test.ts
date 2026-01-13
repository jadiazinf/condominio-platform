import { describe, it, expect, beforeEach } from 'bun:test'
import type { TDocument, TDocumentType } from '@packages/domain'
import { GetDocumentsByTypeService } from '@src/services/documents'

type TMockRepository = {
  getByType: (documentType: TDocumentType) => Promise<TDocument[]>
}

describe('GetDocumentsByTypeService', function () {
  let service: GetDocumentsByTypeService
  let mockRepository: TMockRepository

  const mockDocuments: TDocument[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      documentType: 'invoice',
      title: 'Electricity Invoice January 2024',
      description: 'Monthly electricity bill',
      condominiumId: '550e8400-e29b-41d4-a716-446655440010',
      buildingId: null,
      unitId: null,
      userId: null,
      paymentId: null,
      quotaId: null,
      expenseId: null,
      fileUrl: 'https://example.com/docs/invoice-jan-2024.pdf',
      fileName: 'invoice-jan-2024.pdf',
      fileSize: 256000,
      fileType: 'application/pdf',
      documentDate: '2024-01-10',
      documentNumber: 'INV-001',
      isPublic: false,
      metadata: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      documentType: 'receipt',
      title: 'Payment Receipt - Unit 101',
      description: 'Receipt for monthly quota payment',
      condominiumId: '550e8400-e29b-41d4-a716-446655440010',
      buildingId: null,
      unitId: '550e8400-e29b-41d4-a716-446655440020',
      userId: null,
      paymentId: '550e8400-e29b-41d4-a716-446655440040',
      quotaId: null,
      expenseId: null,
      fileUrl: 'https://example.com/docs/receipt-001.pdf',
      fileName: 'receipt-001.pdf',
      fileSize: 128000,
      fileType: 'application/pdf',
      documentDate: '2024-01-15',
      documentNumber: 'REC-001',
      isPublic: false,
      metadata: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByType: async function (documentType: TDocumentType) {
        return mockDocuments.filter(function (d) {
          return d.documentType === documentType
        })
      },
    }
    service = new GetDocumentsByTypeService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return documents with invoice type', async function () {
      const result = await service.execute({ documentType: 'invoice' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every(d => d.documentType === 'invoice')).toBe(true)
      }
    })

    it('should return documents with receipt type', async function () {
      const result = await service.execute({ documentType: 'receipt' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every(d => d.documentType === 'receipt')).toBe(true)
      }
    })

    it('should return empty array when no documents match type', async function () {
      const result = await service.execute({ documentType: 'contract' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
