import { afterAll, mock } from 'bun:test'
import { stopTestContainer } from './test-container'
import fs from 'node:fs'
import path from 'node:path'

// 0. Set environment variables BEFORE any imports
// Try to find .env.test in current directory or parent directories
let envPath = path.resolve(process.cwd(), '.env.test')
if (!fs.existsSync(envPath)) {
  // If not in current directory, try in the API directory
  envPath = path.resolve(__dirname, '../..', '.env.test')
}

if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8')
  envConfig.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim()
      const trimmedKey = key.trim()

      // Set both process.env and Bun.env
      process.env[trimmedKey] = value
      // @ts-ignore - Bun.env is writable
      Bun.env[trimmedKey] = value
    }
  })
  console.log(`[Preload] Loaded environment from ${envPath}`)
} else {
  console.log(`[Preload] Could not find .env.test at ${envPath}`)
}

// Also set NODE_ENV to test if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test'
  // @ts-ignore
  Bun.env.NODE_ENV = 'test'
}

// 2. Special handling for FIREBASE_SERVICE_ACCOUNT
// If it's a file path (ends in .json), read the file and replace the env var with the content
if (
  process.env.FIREBASE_SERVICE_ACCOUNT &&
  process.env.FIREBASE_SERVICE_ACCOUNT.endsWith('.json')
) {
  const serviceAccountPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT)
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const fileContent = fs.readFileSync(serviceAccountPath, 'utf-8')
      // Validate it's JSON
      JSON.parse(fileContent)
      process.env.FIREBASE_SERVICE_ACCOUNT = fileContent
      console.log(`[Preload] Loaded FIREBASE_SERVICE_ACCOUNT from ${serviceAccountPath}`)
    } catch (e) {
      console.warn(
        `[Preload] Failed to read or parse Firebase service account file at ${serviceAccountPath}:`,
        e
      )
    }
  } else {
    console.warn(`[Preload] FIREBASE_SERVICE_ACCOUNT points to missing file: ${serviceAccountPath}`)
  }
}

// Silence console.error during tests to avoid confusion
// (errors are expected in many tests and don't indicate failures)
console.error = () => {}

// Global cleanup after all tests complete
afterAll(async () => {
  await stopTestContainer()
})

// Handle process termination
process.on('beforeExit', async () => {
  await stopTestContainer()
})

// Helper function to decode JWT payload and extract UID
function decodeJwtPayload(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Decode base64url payload
    const payload = parts[1]
    if (!payload) return null

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = atob(base64)
    const decoded = JSON.parse(jsonPayload)

    return decoded.sub || decoded.user_id || null
  } catch {
    return null
  }
}

// Mock Firebase Admin SDK
mock.module('@libs/firebase/config', () => {
  console.log('[Preload] Mocking @libs/firebase/config')
  return {
    admin: {
      auth: () => ({
        verifyIdToken: async (token: string) => {
          // Handle placeholder tokens (legacy format)
          if (token.startsWith('placeholder-token:')) {
            const uid = token.split(':')[1]
            return { uid }
          }

          // Handle real JWT tokens - decode and extract UID
          const uid = decodeJwtPayload(token)
          if (uid) {
            return { uid }
          }

          // Fallback for any other format
          return { uid: 'test-user-uid' }
        },
        createCustomToken: async (uid: string) => {
          return 'custom-token-' + uid
        },
      }),
    },
  }
})

// Mock auth middleware for controller tests
// This allows tests to bypass authentication
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

const createAuthMock = () => {
  const mockAuthHandler = async (c: { set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
    c.set('user', mockUser)
    await next()
  }
  return {
    authMiddleware: mockAuthHandler,
    isUserAuthenticated: mockAuthHandler,
  }
}

// Mock both path alias and resolved paths for auth middleware
mock.module('@http/middlewares/auth', createAuthMock)
mock.module(path.resolve(process.cwd(), 'src/http/middlewares/auth.ts'), createAuthMock)
mock.module(path.resolve(__dirname, '../../src/http/middlewares/auth.ts'), createAuthMock)
mock.module('../../middlewares/auth', createAuthMock)
