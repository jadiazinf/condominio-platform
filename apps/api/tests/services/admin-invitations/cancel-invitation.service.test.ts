import { describe, it, expect, beforeEach } from 'bun:test'
import type { TAdminInvitation } from '@packages/domain'
import { CancelInvitationService } from '@src/services/admin-invitations'

type TMockRepository = {
  getById: (id: string) => Promise<TAdminInvitation | null>
  markAsCancelled: (id: string) => Promise<TAdminInvitation | null>
}

describe('CancelInvitationService', function () {
  let service: CancelInvitationService
  let mockRepository: TMockRepository

  const pendingInvitation: TAdminInvitation = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    userId: '550e8400-e29b-41d4-a716-446655440010',
    managementCompanyId: '550e8400-e29b-41d4-a716-446655440020',
    token: 'token-1',
    tokenHash: 'hash-1',
    status: 'pending',
    email: 'admin@example.com',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
    emailError: null,
    createdBy: '550e8400-e29b-41d4-a716-446655440099',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const acceptedInvitation: TAdminInvitation = {
    ...pendingInvitation,
    id: '550e8400-e29b-41d4-a716-446655440002',
    token: 'token-2',
    tokenHash: 'hash-2',
    status: 'accepted',
    acceptedAt: new Date(),
  }

  const expiredInvitation: TAdminInvitation = {
    ...pendingInvitation,
    id: '550e8400-e29b-41d4-a716-446655440003',
    token: 'token-3',
    tokenHash: 'hash-3',
    status: 'expired',
  }

  beforeEach(function () {
    mockRepository = {
      getById: async function (id: string) {
        if (id === pendingInvitation.id) return pendingInvitation
        if (id === acceptedInvitation.id) return acceptedInvitation
        if (id === expiredInvitation.id) return expiredInvitation
        return null
      },
      markAsCancelled: async function (id: string) {
        if (id === pendingInvitation.id) {
          return {
            ...pendingInvitation,
            status: 'cancelled' as const,
          }
        }
        return null
      },
    }

    service = new CancelInvitationService(mockRepository as never)
  })

  describe('execute', function () {
    it('should cancel pending invitation successfully', async function () {
      const result = await service.execute({ invitationId: pendingInvitation.id })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('cancelled')
      }
    })

    it('should return NOT_FOUND for non-existent invitation', async function () {
      const result = await service.execute({
        invitationId: '550e8400-e29b-41d4-a716-446655440999',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Invitation not found')
      }
    })

    it('should return BAD_REQUEST for already accepted invitation', async function () {
      const result = await service.execute({ invitationId: acceptedInvitation.id })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Cannot cancel invitation with status: accepted')
      }
    })

    it('should return BAD_REQUEST for expired invitation', async function () {
      const result = await service.execute({ invitationId: expiredInvitation.id })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Cannot cancel invitation with status: expired')
      }
    })
  })
})
