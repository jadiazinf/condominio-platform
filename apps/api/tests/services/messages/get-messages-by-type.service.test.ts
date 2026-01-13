import { describe, it, expect, beforeEach } from 'bun:test'
import type { TMessage, TMessageType } from '@packages/domain'
import { GetMessagesByTypeService } from '@src/services/messages'

type TMockRepository = {
  getByType: (messageType: TMessageType) => Promise<TMessage[]>
}

describe('GetMessagesByTypeService', function () {
  let service: GetMessagesByTypeService
  let mockRepository: TMockRepository

  const mockMessages: TMessage[] = [
    {
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
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      senderId: '550e8400-e29b-41d4-a716-446655440010',
      recipientType: 'condominium',
      recipientUserId: null,
      recipientCondominiumId: '550e8400-e29b-41d4-a716-446655440030',
      recipientBuildingId: null,
      recipientUnitId: null,
      subject: 'Monthly update',
      body: 'Here is the monthly update for all residents.',
      messageType: 'announcement',
      priority: 'high',
      attachments: null,
      isRead: false,
      readAt: null,
      metadata: null,
      registeredBy: '550e8400-e29b-41d4-a716-446655440010',
      sentAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByType: async function (messageType: TMessageType) {
        return mockMessages.filter(function (m) {
          return m.messageType === messageType
        })
      },
    }
    service = new GetMessagesByTypeService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return messages with message type', async function () {
      const result = await service.execute({ messageType: 'message' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every(m => m.messageType === 'message')).toBe(true)
      }
    })

    it('should return messages with announcement type', async function () {
      const result = await service.execute({ messageType: 'announcement' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every(m => m.messageType === 'announcement')).toBe(true)
      }
    })

    it('should return empty array when no messages match type', async function () {
      const result = await service.execute({ messageType: 'notification' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
