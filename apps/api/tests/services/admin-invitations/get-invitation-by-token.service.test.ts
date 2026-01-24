import { describe, it, expect, beforeEach } from 'bun:test'
import type { TAdminInvitation } from '@packages/domain'
import { GetInvitationByTokenService } from '@src/services/admin-invitations'

type TMockRepository = {
  getByToken: (token: string) => Promise<TAdminInvitation | null>
}

describe('GetInvitationByTokenService', function () {
  let service: GetInvitationByTokenService
  let mockRepository: TMockRepository

  const testInvitation: TAdminInvitation = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    userId: '550e8400-e29b-41d4-a716-446655440010',
    managementCompanyId: '550e8400-e29b-41d4-a716-446655440020',
    token: 'test-token-123',
    tokenHash: 'hash-123',
    status: 'pending',
    email: 'admin@example.com',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
    emailError: null,
    createdBy: '550e8400-e29b-41d4-a716-446655440099',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(function () {
    mockRepository = {
      getByToken: async function (token: string) {
        if (token === testInvitation.token) return testInvitation
        return null
      },
    }

    service = new GetInvitationByTokenService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return invitation for valid token', async function () {
      const result = await service.execute({ token: testInvitation.token })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(testInvitation.id)
        expect(result.data.token).toBe(testInvitation.token)
        expect(result.data.status).toBe('pending')
      }
    })

    it('should return NOT_FOUND for invalid token', async function () {
      const result = await service.execute({ token: 'nonexistent-token' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Invitation not found')
      }
    })
  })
})
