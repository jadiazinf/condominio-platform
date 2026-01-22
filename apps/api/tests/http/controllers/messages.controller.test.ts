import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TMessage, TMessageCreate, TMessageUpdate } from '@packages/domain'
import { MessagesController } from '@http/controllers/messages'
import type { MessagesRepository } from '@database/repositories'
import {
  withId,
  createTestApp,
  getErrorMessage,
  type IApiResponse,
  type IStandardErrorResponse,
} from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockMessagesRepository = {
  listAll: () => Promise<TMessage[]>
  getById: (id: string) => Promise<TMessage | null>
  create: (data: TMessageCreate) => Promise<TMessage>
  update: (id: string, data: TMessageUpdate) => Promise<TMessage | null>
  delete: (id: string) => Promise<boolean>
  getBySenderId: (senderId: string) => Promise<TMessage[]>
  getByRecipientUserId: (recipientUserId: string) => Promise<TMessage[]>
  getUnreadByUserId: (userId: string) => Promise<TMessage[]>
  getByType: (messageType: string) => Promise<TMessage[]>
  getByCondominiumId: (condominiumId: string) => Promise<TMessage[]>
  markAsRead: (id: string) => Promise<TMessage | null>
}

function createMessage(senderId: string, overrides: Partial<TMessageCreate> = {}): TMessageCreate {
  return {
    senderId,
    recipientType: 'user',
    recipientUserId: null,
    recipientCondominiumId: null,
    recipientBuildingId: null,
    recipientUnitId: null,
    subject: 'Test Message',
    body: 'This is a test message',
    messageType: 'announcement',
    priority: 'normal',
    attachments: null,
    isRead: false,
    readAt: null,
    metadata: null,
    registeredBy: null,
    ...overrides,
  }
}

describe('MessagesController', function () {
  let app: Hono
  let request: (path: string, options?: RequestInit) => Promise<Response>
  let mockRepository: TMockMessagesRepository
  let testMessages: TMessage[]

  const senderId = '550e8400-e29b-41d4-a716-446655440010'
  const recipientId1 = '550e8400-e29b-41d4-a716-446655440011'
  const recipientId2 = '550e8400-e29b-41d4-a716-446655440012'
  const condominiumId = '550e8400-e29b-41d4-a716-446655440020'

  beforeEach(function () {
    // Create test data
    const msg1 = createMessage(senderId, {
      recipientUserId: recipientId1,
      messageType: 'announcement',
      isRead: false,
    })
    const msg2 = createMessage(senderId, {
      recipientUserId: recipientId1,
      messageType: 'notification',
      isRead: true,
    })
    const msg3 = createMessage(senderId, {
      recipientCondominiumId: condominiumId,
      messageType: 'announcement',
      isRead: false,
    })

    testMessages = [
      withId(msg1, '550e8400-e29b-41d4-a716-446655440001') as TMessage,
      withId(msg2, '550e8400-e29b-41d4-a716-446655440002') as TMessage,
      withId(msg3, '550e8400-e29b-41d4-a716-446655440003') as TMessage,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testMessages
      },
      getById: async function (id: string) {
        return (
          testMessages.find(function (m) {
            return m.id === id
          }) || null
        )
      },
      create: async function (data: TMessageCreate) {
        return withId(data, crypto.randomUUID()) as TMessage
      },
      update: async function (id: string, data: TMessageUpdate) {
        const m = testMessages.find(function (item) {
          return item.id === id
        })
        if (!m) return null
        return { ...m, ...data } as TMessage
      },
      delete: async function (id: string) {
        return testMessages.some(function (m) {
          return m.id === id
        })
      },
      getBySenderId: async function (senderId: string) {
        return testMessages.filter(function (m) {
          return m.senderId === senderId
        })
      },
      getByRecipientUserId: async function (recipientUserId: string) {
        return testMessages.filter(function (m) {
          return m.recipientUserId === recipientUserId
        })
      },
      getUnreadByUserId: async function (userId: string) {
        return testMessages.filter(function (m) {
          return m.recipientUserId === userId && !m.isRead
        })
      },
      getByType: async function (messageType: string) {
        return testMessages.filter(function (m) {
          return m.messageType === messageType
        })
      },
      getByCondominiumId: async function (condominiumId: string) {
        return testMessages.filter(function (m) {
          return m.recipientCondominiumId === condominiumId
        })
      },
      markAsRead: async function (id: string) {
        const m = testMessages.find(function (item) {
          return item.id === id
        })
        if (!m) return null
        return { ...m, isRead: true, readAt: new Date() } as TMessage
      },
    }

    // Create controller with mock repository
    const controller = new MessagesController(mockRepository as unknown as MessagesRepository)

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/messages', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all messages', async function () {
      const res = await request('/messages')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no messages exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/messages')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return message by ID', async function () {
      const res = await request('/messages/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.subject).toBe('Test Message')
    })

    it('should return 404 when message not found', async function () {
      const res = await request('/messages/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/messages/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /sender/:senderId (getBySenderId)', function () {
    it('should return messages by sender ID', async function () {
      const res = await request(`/messages/sender/${senderId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
      expect(
        json.data.every(function (m: TMessage) {
          return m.senderId === senderId
        })
      ).toBe(true)
    })

    it('should return empty array when no messages from sender', async function () {
      mockRepository.getBySenderId = async function () {
        return []
      }

      const res = await request('/messages/sender/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /recipient/:recipientUserId (getByRecipientUserId)', function () {
    it('should return messages by recipient user ID', async function () {
      const res = await request(`/messages/recipient/${recipientId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (m: TMessage) {
          return m.recipientUserId === recipientId1
        })
      ).toBe(true)
    })

    it('should return empty array when no messages for recipient', async function () {
      mockRepository.getByRecipientUserId = async function () {
        return []
      }

      const res = await request(`/messages/recipient/${recipientId2}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /recipient/:recipientUserId/unread (getUnreadByUserId)', function () {
    it('should return unread messages for user', async function () {
      const res = await request(`/messages/recipient/${recipientId1}/unread`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].isRead).toBe(false)
    })

    it('should return empty array when no unread messages', async function () {
      mockRepository.getUnreadByUserId = async function () {
        return []
      }

      const res = await request(`/messages/recipient/${recipientId2}/unread`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /type/:messageType (getByType)', function () {
    it('should return messages by type', async function () {
      const res = await request('/messages/type/announcement')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (m: TMessage) {
          return m.messageType === 'announcement'
        })
      ).toBe(true)
    })

    it('should return empty array when no messages of type', async function () {
      mockRepository.getByType = async function () {
        return []
      }

      const res = await request('/messages/type/unknown')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /condominium/:condominiumId (getByCondominiumId)', function () {
    it('should return messages by condominium ID', async function () {
      const res = await request(`/messages/condominium/${condominiumId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].recipientCondominiumId).toBe(condominiumId)
    })

    it('should return empty array when no messages for condominium', async function () {
      mockRepository.getByCondominiumId = async function () {
        return []
      }

      const res = await request('/messages/condominium/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('POST /:id/read (markAsRead)', function () {
    it('should mark message as read', async function () {
      const res = await request('/messages/550e8400-e29b-41d4-a716-446655440001/read', {
        method: 'POST',
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.isRead).toBe(true)
      expect(json.data.readAt).toBeDefined()
    })

    it('should return 404 when message not found', async function () {
      mockRepository.markAsRead = async function () {
        return null
      }

      const res = await request('/messages/550e8400-e29b-41d4-a716-446655440099/read', {
        method: 'POST',
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toBe('Message not found')
    })
  })

  describe('POST / (create)', function () {
    it('should create a new message', async function () {
      const newMessage = createMessage(senderId, {
        recipientUserId: recipientId2,
        subject: 'New Message',
      })

      const res = await request('/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMessage),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.subject).toBe('New Message')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: 'invalid' }),
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

      const newMessage = createMessage('550e8400-e29b-41d4-a716-446655440099')

      const res = await request('/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMessage),
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('reference')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing message', async function () {
      const res = await request('/messages/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'Updated Subject' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.subject).toBe('Updated Subject')
    })

    it('should return 404 when updating non-existent message', async function () {
      const res = await request('/messages/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'Updated' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing message', async function () {
      const res = await request('/messages/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent message', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/messages/550e8400-e29b-41d4-a716-446655440099', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('Error handling', function () {
    it('should return 500 for unexpected errors', async function () {
      mockRepository.listAll = async function () {
        throw new Error('Unexpected database error')
      }

      const res = await request('/messages')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })
  })
})
