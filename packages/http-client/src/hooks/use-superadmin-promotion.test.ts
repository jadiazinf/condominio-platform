import { describe, it, expect, vi, beforeEach } from 'vitest'
import { promoteUserToSuperadmin, demoteUserFromSuperadmin } from './use-superadmin-promotion'
import { getHttpClient } from '../client/http-client'

// Mock the HTTP client
vi.mock('../client/http-client', () => ({
  getHttpClient: vi.fn(),
}))

describe('use-superadmin-promotion', () => {
  const mockPost = vi.fn()
  const mockToken = 'test-token'
  const mockUserId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getHttpClient as any).mockReturnValue({
      post: mockPost,
    })
  })

  describe('promoteUserToSuperadmin', () => {
    it('should call the correct endpoint with permissions payload', async () => {
      const permissionIds = ['perm-1', 'perm-2', 'perm-3']
      const mockResponse = { data: { message: 'User promoted successfully' } }

      mockPost.mockResolvedValue(mockResponse)

      const result = await promoteUserToSuperadmin(mockToken, mockUserId, permissionIds)

      expect(mockPost).toHaveBeenCalledWith(
        `/users/${mockUserId}/promote-to-superadmin`,
        { permissionIds },
        {
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        }
      )
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle empty permissions array', async () => {
      const permissionIds: string[] = []
      const mockResponse = { data: { message: 'User promoted successfully' } }

      mockPost.mockResolvedValue(mockResponse)

      const result = await promoteUserToSuperadmin(mockToken, mockUserId, permissionIds)

      expect(mockPost).toHaveBeenCalledWith(
        `/users/${mockUserId}/promote-to-superadmin`,
        { permissionIds: [] },
        expect.any(Object)
      )
      expect(result).toEqual(mockResponse.data)
    })

    it('should throw error when API call fails', async () => {
      mockPost.mockRejectedValue(new Error('API Error'))

      await expect(
        promoteUserToSuperadmin(mockToken, mockUserId, ['perm-1'])
      ).rejects.toThrow('API Error')
    })
  })

  describe('demoteUserFromSuperadmin', () => {
    it('should call the correct endpoint', async () => {
      const mockResponse = { data: { message: 'User demoted successfully' } }

      mockPost.mockResolvedValue(mockResponse)

      const result = await demoteUserFromSuperadmin(mockToken, mockUserId)

      expect(mockPost).toHaveBeenCalledWith(
        `/users/${mockUserId}/demote-from-superadmin`,
        {},
        {
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        }
      )
      expect(result).toEqual(mockResponse.data)
    })

    it('should throw error when API call fails', async () => {
      mockPost.mockRejectedValue(new Error('API Error'))

      await expect(demoteUserFromSuperadmin(mockToken, mockUserId)).rejects.toThrow('API Error')
    })
  })
})
