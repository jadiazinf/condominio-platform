import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TDocument, TDocumentCreate, TDocumentUpdate } from '@packages/domain'
import { DocumentsController } from '@http/controllers/documents'
import type { DocumentsRepository } from '@database/repositories'
import { withId, createTestApp, type IApiResponse, type IStandardErrorResponse } from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockDocumentsRepository = {
  listAll: () => Promise<TDocument[]>
  getById: (id: string) => Promise<TDocument | null>
  create: (data: TDocumentCreate) => Promise<TDocument>
  update: (id: string, data: TDocumentUpdate) => Promise<TDocument | null>
  delete: (id: string) => Promise<boolean>
  getPublicDocuments: () => Promise<TDocument[]>
  getByType: (documentType: string) => Promise<TDocument[]>
  getByCondominiumId: (condominiumId: string) => Promise<TDocument[]>
  getByBuildingId: (buildingId: string) => Promise<TDocument[]>
  getByUnitId: (unitId: string) => Promise<TDocument[]>
  getByUserId: (userId: string) => Promise<TDocument[]>
  getByPaymentId: (paymentId: string) => Promise<TDocument[]>
}

function createDocument(overrides: Partial<TDocumentCreate> = {}): TDocumentCreate {
  return {
    documentType: 'regulation',
    title: 'Test Document',
    description: 'Test description',
    condominiumId: null,
    buildingId: null,
    unitId: null,
    userId: null,
    paymentId: null,
    quotaId: null,
    expenseId: null,
    fileUrl: 'https://storage.example.com/doc.pdf',
    fileName: 'doc.pdf',
    fileSize: 1024,
    fileType: 'application/pdf',
    documentDate: null,
    documentNumber: null,
    isPublic: false,
    metadata: null,
    createdBy: null,
    ...overrides,
  }
}

describe('DocumentsController', function () {
  let app: Hono
  let request: (path: string, options?: RequestInit) => Promise<Response>
  let mockRepository: TMockDocumentsRepository
  let testDocuments: TDocument[]

  const condominiumId = '550e8400-e29b-41d4-a716-446655440010'
  const buildingId = '550e8400-e29b-41d4-a716-446655440011'
  const unitId = '550e8400-e29b-41d4-a716-446655440012'
  const userId = '550e8400-e29b-41d4-a716-446655440013'
  const paymentId = '550e8400-e29b-41d4-a716-446655440014'

  beforeEach(function () {
    // Create test data
    const doc1 = createDocument({
      title: 'Public Regulation',
      documentType: 'regulation',
      isPublic: true,
      condominiumId,
    })
    const doc2 = createDocument({ title: 'Building Rules', documentType: 'other', buildingId })
    const doc3 = createDocument({
      title: 'Payment Receipt',
      documentType: 'receipt',
      paymentId,
      userId,
    })

    testDocuments = [
      withId(doc1, '550e8400-e29b-41d4-a716-446655440001') as TDocument,
      withId(doc2, '550e8400-e29b-41d4-a716-446655440002') as TDocument,
      withId(doc3, '550e8400-e29b-41d4-a716-446655440003') as TDocument,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testDocuments
      },
      getById: async function (id: string) {
        return (
          testDocuments.find(function (d) {
            return d.id === id
          }) || null
        )
      },
      create: async function (data: TDocumentCreate) {
        return withId(data, crypto.randomUUID()) as TDocument
      },
      update: async function (id: string, data: TDocumentUpdate) {
        const d = testDocuments.find(function (item) {
          return item.id === id
        })
        if (!d) return null
        return { ...d, ...data } as TDocument
      },
      delete: async function (id: string) {
        return testDocuments.some(function (d) {
          return d.id === id
        })
      },
      getPublicDocuments: async function () {
        return testDocuments.filter(function (d) {
          return d.isPublic
        })
      },
      getByType: async function (documentType: string) {
        return testDocuments.filter(function (d) {
          return d.documentType === documentType
        })
      },
      getByCondominiumId: async function (condominiumId: string) {
        return testDocuments.filter(function (d) {
          return d.condominiumId === condominiumId
        })
      },
      getByBuildingId: async function (buildingId: string) {
        return testDocuments.filter(function (d) {
          return d.buildingId === buildingId
        })
      },
      getByUnitId: async function (unitId: string) {
        return testDocuments.filter(function (d) {
          return d.unitId === unitId
        })
      },
      getByUserId: async function (userId: string) {
        return testDocuments.filter(function (d) {
          return d.userId === userId
        })
      },
      getByPaymentId: async function (paymentId: string) {
        return testDocuments.filter(function (d) {
          return d.paymentId === paymentId
        })
      },
    }

    // Create controller with mock repository
    const controller = new DocumentsController(mockRepository as unknown as DocumentsRepository)

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/documents', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all documents', async function () {
      const res = await request('/documents')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no documents exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/documents')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return document by ID', async function () {
      const res = await request('/documents/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.title).toBe('Public Regulation')
    })

    it('should return 404 when document not found', async function () {
      const res = await request('/documents/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/documents/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /public (getPublicDocuments)', function () {
    it('should return public documents only', async function () {
      const res = await request('/documents/public')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].isPublic).toBe(true)
    })

    it('should return empty array when no public documents', async function () {
      mockRepository.getPublicDocuments = async function () {
        return []
      }

      const res = await request('/documents/public')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /type/:documentType (getByType)', function () {
    it('should return documents by type', async function () {
      const res = await request('/documents/type/regulation')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].documentType).toBe('regulation')
    })

    it('should return empty array when no documents of type', async function () {
      mockRepository.getByType = async function () {
        return []
      }

      const res = await request('/documents/type/unknown')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /condominium/:condominiumId (getByCondominiumId)', function () {
    it('should return documents by condominium ID', async function () {
      const res = await request(`/documents/condominium/${condominiumId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].condominiumId).toBe(condominiumId)
    })
  })

  describe('GET /building/:buildingId (getByBuildingId)', function () {
    it('should return documents by building ID', async function () {
      const res = await request(`/documents/building/${buildingId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].buildingId).toBe(buildingId)
    })
  })

  describe('GET /unit/:unitId (getByUnitId)', function () {
    it('should return documents by unit ID', async function () {
      mockRepository.getByUnitId = async function () {
        return testDocuments.filter(function (d) {
          return d.unitId === unitId
        })
      }

      const res = await request(`/documents/unit/${unitId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /user/:userId (getByUserId)', function () {
    it('should return documents by user ID', async function () {
      const res = await request(`/documents/user/${userId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].userId).toBe(userId)
    })
  })

  describe('GET /payment/:paymentId (getByPaymentId)', function () {
    it('should return documents by payment ID', async function () {
      const res = await request(`/documents/payment/${paymentId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].paymentId).toBe(paymentId)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new document', async function () {
      const newDocument = createDocument({ title: 'New Document' })

      const res = await request('/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDocument),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.title).toBe('New Document')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)

      const json = (await res.json()) as IStandardErrorResponse
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
      expect(json.error.message).toBeDefined()
      expect(json.error.fields).toBeDefined()
      expect(Array.isArray(json.error.fields)).toBe(true)
    })

    it('should return 400 for foreign key violations', async function () {
      mockRepository.create = async function () {
        throw new Error('violates foreign key constraint')
      }

      const newDocument = createDocument({ condominiumId: '550e8400-e29b-41d4-a716-446655440099' })

      const res = await request('/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDocument),
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Invalid reference to related resource')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing document', async function () {
      const res = await request('/documents/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.title).toBe('Updated Title')
    })

    it('should return 404 when updating non-existent document', async function () {
      const res = await request('/documents/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing document', async function () {
      const res = await request('/documents/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent document', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/documents/550e8400-e29b-41d4-a716-446655440099', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })
  })

  describe('Error handling', function () {
    it('should return 500 for unexpected errors', async function () {
      mockRepository.listAll = async function () {
        throw new Error('Unexpected database error')
      }

      const res = await request('/documents')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('An unexpected error occurred')
    })
  })
})
