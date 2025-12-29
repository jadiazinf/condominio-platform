import { mock } from 'bun:test'
import path from 'path'
import type { Context, Next } from 'hono'
import type { TUser } from '@packages/domain'

const authMiddlewarePath = path.resolve(process.cwd(), 'src/http/middlewares/auth.ts')

const mockUser: TUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'auth@test.com',
  firebaseUid: 'firebase-uid-1',
  isActive: true,
  displayName: 'Test User',
  phoneNumber: null,
  photoUrl: null,
  firstName: 'Test',
  lastName: 'User',
  idDocumentType: null,
  idDocumentNumber: null,
  address: null,
  locationId: null,
  preferredLanguage: 'es',
  preferredCurrencyId: null,
  isEmailVerified: true,
  lastLogin: null,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockAuthHandler = async (c: Context, next: Next) => {
  c.set('user', mockUser)
  await next()
}

const mockAuthMiddleware = () => ({
  authMiddleware: mockAuthHandler,
  isUserAuthenticated: mockAuthHandler,
})

// Mock auth middleware paths used by controllers
// Note: We don't mock the utils path to allow middleware tests to use the real implementation
mock.module('@http/middlewares/auth', mockAuthMiddleware)
mock.module(authMiddlewarePath, mockAuthMiddleware)
