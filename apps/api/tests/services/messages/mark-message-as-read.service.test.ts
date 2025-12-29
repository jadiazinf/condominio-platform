import { describe, it, expect, beforeEach } from 'bun:test'
import type { TMessage } from '@packages/domain'
import { MarkMessageAsReadService } from '@src/services/messages'

type TMockRepository = {
  markAsRead: (messageId: string) => Promise<TMessage | null>
}

describe('MarkMessageAsReadService', function () {
  let service: MarkMessageAsReadService
  let mockRepository: TMockRepository

  const unreadMessage: TMessage = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    senderId: '550e8400-e29b-41d4-a716-446655440010',
    recipientType: 'user',
    recipientUserId: '550e8400-e29b-41d4-a716-446655440020',
    recipientCondominiumId: null,
    recipientBuildingId: null,
    recipientUnitId: null,
    subject: 'Welcome message',
    body: 'Welcome to our condominium!',
    messageType: 'message',
    priority: 'normal',
    attachments: null,
    isRead: false,
    readAt: null,
    metadata: null,
    registeredBy: '550e8400-e29b-41d4-a716-446655440010',
    sentAt: new Date(),
  }

  beforeEach(function () {
    mockRepository = {
      markAsRead: async function (messageId: string) {
        if (messageId === unreadMessage.id) {
          return {
            ...unreadMessage,
            isRead: true,
            readAt: new Date(),
          }
        }
        return null
      },
    }
    service = new MarkMessageAsReadService(mockRepository as never)
  })

  describe('execute', function () {
    it('should mark message as read successfully', async function () {
      const result = await service.execute({ messageId: unreadMessage.id })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isRead).toBe(true)
        expect(result.data.readAt).toBeDefined()
      }
    })

    it('should return NOT_FOUND error when message does not exist', async function () {
      const result = await service.execute({ messageId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Message not found')
      }
    })
  })
})
