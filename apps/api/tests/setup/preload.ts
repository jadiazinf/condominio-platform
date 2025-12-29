import { afterAll, mock } from 'bun:test'
import { stopTestContainer } from './test-container'
import fs from 'node:fs'
import path from 'node:path'

// 1. Manually load .env.test if it exists (Bun might do this, but we want to be sure)
const envPath = path.resolve(process.cwd(), '.env.test')
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8')
  envConfig.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim()
      const trimmedKey = key.trim()

      // Only set if not already set, to respect existing env vars
      if (!process.env[trimmedKey]) {
        process.env[trimmedKey] = value
      }
    }
  })
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

// Mock Firebase Admin SDK
mock.module('@libs/firebase/config', () => {
  console.log('[Preload] Mocking @libs/firebase/config')
  return {
    admin: {
      auth: () => ({
        verifyIdToken: async (token: string) => {
          if (token.startsWith('placeholder-token:')) {
            const uid = token.split(':')[1]
            return { uid }
          }
          return { uid: 'test-user-uid' }
        },
        createCustomToken: async (uid: string) => {
          return 'custom-token-' + uid
        },
      }),
    },
  }
})
