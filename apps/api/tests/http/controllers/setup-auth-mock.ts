// Mock auth middleware for controller tests
import { mock } from 'bun:test'
import path from 'node:path'

const mockUser = {
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

const mockAuthHandler = async (
  c: { set: (key: string, value: unknown) => void },
  next: () => Promise<void>
) => {
  c.set('user', mockUser)
  await next()
}

// Mock the actual path that controllers import from
const authModulePath = path.resolve(__dirname, '../../../src/http/middlewares/auth.ts')
console.log('[Auth Mock] Mocking auth module at:', authModulePath)

mock.module(authModulePath, () => ({
  authMiddleware: mockAuthHandler,
  isUserAuthenticated: mockAuthHandler,
}))

// Also try mocking with alias
mock.module('@http/middlewares/auth', () => ({
  authMiddleware: mockAuthHandler,
  isUserAuthenticated: mockAuthHandler,
}))
