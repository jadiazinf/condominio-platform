import { describe, it, expect, beforeEach } from 'bun:test'
import type { TMessage } from '@packages/domain'
import { GetMessagesBySenderService } from '@src/services/messages'

type TMockRepository = {
  getBySenderId: (senderId: string) => Promise<TMessage[]>
}

describe('GetMessagesBySenderService', function () {
  let service: GetMessagesBySenderService
  let mockRepository: TMockRepository

  const senderId = '550e8400-e29b-41d4-a716-446655440010'

  const mockMessages: TMessage[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      senderId,
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
      registeredBy: senderId,
      sentAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      senderId,
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
      registeredBy: senderId,
      sentAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getBySenderId: async function (requestedSenderId: string) {
        return mockMessages.filter(function (m) {
          return m.senderId === requestedSenderId
        })
      },
    }
    service = new GetMessagesBySenderService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all messages from a sender', async function () {
      const result = await service.execute({ senderId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(m => m.senderId === senderId)).toBe(true)
      }
    })

    it('should return empty array when sender has no messages', async function () {
      const result = await service.execute({ senderId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
