import { describe, it, expect, beforeEach } from 'bun:test'
import type { TAdminInvitation } from '@packages/domain'
import { GetInvitationsByEmailService } from '@src/services/admin-invitations'

type TMockRepository = {
  getPendingByEmail: (email: string) => Promise<TAdminInvitation[]>
}

describe('GetInvitationsByEmailService', function () {
  let service: GetInvitationsByEmailService
  let mockRepository: TMockRepository

  const testEmail = 'admin@example.com'

  const invitation1: TAdminInvitation = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    userId: '550e8400-e29b-41d4-a716-446655440010',
    managementCompanyId: '550e8400-e29b-41d4-a716-446655440020',
    token: 'token-1',
    tokenHash: 'hash-1',
    status: 'pending',
    email: testEmail,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
    emailError: null,
    createdBy: '550e8400-e29b-41d4-a716-446655440099',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const invitation2: TAdminInvitation = {
    ...invitation1,
    id: '550e8400-e29b-41d4-a716-446655440002',
    managementCompanyId: '550e8400-e29b-41d4-a716-446655440021',
    token: 'token-2',
    tokenHash: 'hash-2',
  }

  beforeEach(function () {
    mockRepository = {
      getPendingByEmail: async function (email: string) {
        if (email === testEmail) return [invitation1, invitation2]
        return []
      },
    }

    service = new GetInvitationsByEmailService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return pending invitations for email', async function () {
      const result = await service.execute({ email: testEmail })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0]?.email).toBe(testEmail)
        expect(result.data[1]?.email).toBe(testEmail)
      }
    })

    it('should return empty array for email with no invitations', async function () {
      const result = await service.execute({ email: 'unknown@example.com' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
