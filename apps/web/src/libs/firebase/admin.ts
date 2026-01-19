import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

import { initializeApp, getApps, cert, type App, type ServiceAccount } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'

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

  // Option 1: Load from JSON file
  const serviceAccount = loadServiceAccountFromFile()

  if (serviceAccount) {
    return initializeApp({
      credential: cert(serviceAccount),
    })
  }

  // Option 2: Load from environment variables
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin SDK credentials are not configured. ' +
        'Either place a firebaseServiceAccountKey.json file in the apps/web directory, ' +
        'set FIREBASE_SERVICE_ACCOUNT_PATH to point to your service account JSON file, ' +
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
