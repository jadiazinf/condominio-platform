import { describe, it, expect, beforeEach } from 'bun:test'
import type { TMessage } from '@packages/domain'
import { GetMessagesByCondominiumService } from '@src/services/messages'

type TMockRepository = {
  getByCondominiumId: (condominiumId: string) => Promise<TMessage[]>
}

describe('GetMessagesByCondominiumService', function () {
  let service: GetMessagesByCondominiumService
  let mockRepository: TMockRepository

  const condominiumId = '550e8400-e29b-41d4-a716-446655440030'

  const mockMessages: TMessage[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      senderId: '550e8400-e29b-41d4-a716-446655440010',
      recipientType: 'condominium',
      recipientUserId: null,
      recipientCondominiumId: condominiumId,
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
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      senderId: '550e8400-e29b-41d4-a716-446655440011',
      recipientType: 'condominium',
      recipientUserId: null,
      recipientCondominiumId: condominiumId,
      recipientBuildingId: null,
      recipientUnitId: null,
      subject: 'Maintenance notice',
      body: 'There will be maintenance work on Saturday.',
      messageType: 'notification',
      priority: 'normal',
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
      getByCondominiumId: async function (requestedCondominiumId: string) {
        return mockMessages.filter(function (m) {
          return m.recipientCondominiumId === requestedCondominiumId
        })
      },
    }
    service = new GetMessagesByCondominiumService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all messages for a condominium', async function () {
      const result = await service.execute({ condominiumId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((m) => m.recipientCondominiumId === condominiumId)).toBe(true)
      }
    })

    it('should return empty array when condominium has no messages', async function () {
      const result = await service.execute({ condominiumId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
