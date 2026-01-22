import admin from 'firebase-admin'
import logger from '@utils/logger'
import { env } from '@config/environment'

const getFirebaseCredentials = (): admin.ServiceAccount => {
  const isProduction = env.NODE_ENV === 'production' || env.NODE_ENV === 'staging'

  if (isProduction) {
    if (!env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is required in production')
    }
    const decoded = Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
    return JSON.parse(decoded) as admin.ServiceAccount
  }

  // Development: use local JSON file
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const localCredentials = require('@root/firebaseServiceAccountKey.json')
  return localCredentials as admin.ServiceAccount
}

let firebaseInitialized = false

const initializeFirebase = () => {
  const isProduction = env.NODE_ENV === 'production' || env.NODE_ENV === 'staging'

  try {
    const credentials = getFirebaseCredentials()
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
    })
    firebaseInitialized = true
    logger.info('Firebase Admin SDK initialized successfully')
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize Firebase Admin SDK')
    // In production, fail hard if Firebase cannot be initialized
    if (isProduction) {
      throw error
    }
  }
}

function isFirebaseInitialized(): boolean {
  return firebaseInitialized
}

initializeFirebase()

export { admin, isFirebaseInitialized }
