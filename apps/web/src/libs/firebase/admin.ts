import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

import { initializeApp, getApps, cert, type App, type ServiceAccount } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'

function loadServiceAccountFromBase64(): ServiceAccount | null {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64

  if (!base64) {
    return null
  }

  try {
    const decoded = Buffer.from(base64, 'base64').toString('utf-8')

    return JSON.parse(decoded) as ServiceAccount
  } catch {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64')

    return null
  }
}

function loadServiceAccountFromFile(): ServiceAccount | null {
  // Try to load from common locations
  const possiblePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    join(process.cwd(), 'firebaseServiceAccountKey.json'),
    join(process.cwd(), 'firebase-service-account.json'),
    join(process.cwd(), 'serviceAccountKey.json'),
  ].filter(Boolean) as string[]

  for (const filePath of possiblePaths) {
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8')

        return JSON.parse(content) as ServiceAccount
      } catch {
        console.error(`Failed to parse service account file: ${filePath}`)
      }
    }
  }

  return null
}

function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  // Option 1: Load from Base64 environment variable (preferred for Vercel/production)
  const serviceAccountFromBase64 = loadServiceAccountFromBase64()

  if (serviceAccountFromBase64) {
    return initializeApp({
      credential: cert(serviceAccountFromBase64),
    })
  }

  // Option 2: Load from JSON file (for local development)
  const serviceAccountFromFile = loadServiceAccountFromFile()

  if (serviceAccountFromFile) {
    return initializeApp({
      credential: cert(serviceAccountFromFile),
    })
  }

  // Option 3: Load from individual environment variables (fallback)
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin SDK credentials are not configured. ' +
        'Set FIREBASE_SERVICE_ACCOUNT_BASE64 with the base64-encoded service account JSON, ' +
        'or place a firebaseServiceAccountKey.json file in the apps/web directory, ' +
        'or set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY environment variables.'
    )
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
}

let adminAuth: Auth | null = null

function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getFirebaseAdminApp())
  }

  return adminAuth
}

export { getAdminAuth }
