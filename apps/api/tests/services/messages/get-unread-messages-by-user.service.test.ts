import { describe, it, expect, beforeEach } from 'bun:test'
import type { TMessage } from '@packages/domain'
import { GetUnreadMessagesByUserService } from '@src/services/messages'

type TMockRepository = {
  getUnreadByUserId: (recipientUserId: string) => Promise<TMessage[]>
}

describe('GetUnreadMessagesByUserService', function () {
  let service: GetUnreadMessagesByUserService
  let mockRepository: TMockRepository

  const recipientUserId = '550e8400-e29b-41d4-a716-446655440020'

  const mockMessages: TMessage[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      senderId: '550e8400-e29b-41d4-a716-446655440010',
      recipientType: 'user',
      recipientUserId,
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
      senderId: '550e8400-e29b-41d4-a716-446655440011',
      recipientType: 'user',
      recipientUserId,
      recipientCondominiumId: null,
      recipientBuildingId: null,
      recipientUnitId: null,
      subject: 'Payment reminder',
      body: 'Please remember to pay your monthly quota.',
      messageType: 'notification',
      priority: 'high',
      attachments: null,
      isRead: false,
      readAt: null,
      metadata: null,
      registeredBy: '550e8400-e29b-41d4-a716-446655440011',
      sentAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getUnreadByUserId: async function (requestedRecipientUserId: string) {
        return mockMessages.filter(function (m) {
          return m.recipientUserId === requestedRecipientUserId && !m.isRead
        })
      },
    }
    service = new GetUnreadMessagesByUserService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all unread messages for a user', async function () {
      const result = await service.execute({ recipientUserId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((m) => m.isRead === false)).toBe(true)
      }
    })

    it('should return empty array when user has no unread messages', async function () {
      const result = await service.execute({ recipientUserId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
