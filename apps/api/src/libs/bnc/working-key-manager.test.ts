import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { WorkingKeyManager } from './working-key-manager'

describe('WorkingKeyManager', () => {
  let authFn: ReturnType<typeof mock>
  let manager: WorkingKeyManager

  beforeEach(() => {
    authFn = mock(() => Promise.resolve('test-working-key-123'))
    manager = new WorkingKeyManager(authFn)
  })

  describe('getWorkingKey', () => {
    it('should authenticate on first call', async () => {
      const key = await manager.getWorkingKey()

      expect(key).toBe('test-working-key-123')
      expect(authFn).toHaveBeenCalledTimes(1)
    })

    it('should return cached key on subsequent calls', async () => {
      await manager.getWorkingKey()
      const key = await manager.getWorkingKey()

      expect(key).toBe('test-working-key-123')
      expect(authFn).toHaveBeenCalledTimes(1)
    })

    it('should re-authenticate after invalidation', async () => {
      await manager.getWorkingKey()
      manager.invalidate()

      authFn.mockImplementation(() => Promise.resolve('new-key-456'))
      const key = await manager.getWorkingKey()

      expect(key).toBe('new-key-456')
      expect(authFn).toHaveBeenCalledTimes(2)
    })
  })

  describe('refresh', () => {
    it('should force re-authentication', async () => {
      await manager.getWorkingKey()

      authFn.mockImplementation(() => Promise.resolve('refreshed-key'))
      const key = await manager.refresh()

      expect(key).toBe('refreshed-key')
      expect(authFn).toHaveBeenCalledTimes(2)
    })

    it('should share concurrent auth requests (thread safety)', async () => {
      let resolveAuth: (value: string) => void
      authFn.mockImplementation(
        () =>
          new Promise<string>(resolve => {
            resolveAuth = resolve
          })
      )

      // Start 3 concurrent getWorkingKey calls
      const p1 = manager.getWorkingKey()
      const p2 = manager.getWorkingKey()
      const p3 = manager.getWorkingKey()

      // All should be waiting on the same promise
      // Resolve the single auth call
      resolveAuth!('shared-key')

      const [k1, k2, k3] = await Promise.all([p1, p2, p3])

      expect(k1).toBe('shared-key')
      expect(k2).toBe('shared-key')
      expect(k3).toBe('shared-key')
      // Should only have authenticated once
      expect(authFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('invalidate', () => {
    it('should clear the cached key', async () => {
      await manager.getWorkingKey()
      expect(manager.isValid()).toBe(true)

      manager.invalidate()
      expect(manager.isValid()).toBe(false)
    })
  })

  describe('isValid', () => {
    it('should return false before first auth', () => {
      expect(manager.isValid()).toBe(false)
    })

    it('should return true after auth', async () => {
      await manager.getWorkingKey()
      expect(manager.isValid()).toBe(true)
    })

    it('should return false after invalidation', async () => {
      await manager.getWorkingKey()
      manager.invalidate()
      expect(manager.isValid()).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should propagate auth errors', async () => {
      authFn.mockImplementation(() => Promise.reject(new Error('Auth failed')))

      await expect(manager.getWorkingKey()).rejects.toThrow('Auth failed')
    })

    it('should allow retry after auth failure', async () => {
      authFn.mockImplementationOnce(() => Promise.reject(new Error('Auth failed')))

      await expect(manager.getWorkingKey()).rejects.toThrow('Auth failed')

      // Next call should retry
      authFn.mockImplementation(() => Promise.resolve('recovered-key'))
      const key = await manager.getWorkingKey()

      expect(key).toBe('recovered-key')
    })
  })
})
