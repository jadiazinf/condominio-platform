import admin from 'firebase-admin'
import logger from '../../../logger/src'

export interface IFirebaseConfig {
  nodeEnv: string
  firebaseServiceAccountBase64?: string
  localCredentialsPath?: string
}

const getFirebaseCredentials = (config: IFirebaseConfig): admin.ServiceAccount => {
  const isProduction = config.nodeEnv === 'production' || config.nodeEnv === 'staging'

  if (isProduction) {
    if (!config.firebaseServiceAccountBase64) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is required in production')
    }
    const decoded = Buffer.from(config.firebaseServiceAccountBase64, 'base64').toString('utf-8')
    return JSON.parse(decoded) as admin.ServiceAccount
  }

  if (!config.localCredentialsPath) {
    throw new Error('localCredentialsPath is required in development')
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const localCredentials = require(config.localCredentialsPath)
  return localCredentials as admin.ServiceAccount
}

let firebaseInitialized = false

export const initializeFirebaseAdmin = (config: IFirebaseConfig) => {
  if (firebaseInitialized) return

  const isProduction = config.nodeEnv === 'production' || config.nodeEnv === 'staging'

  try {
    const credentials = getFirebaseCredentials(config)
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
    })
    firebaseInitialized = true
    logger.info('Firebase Admin SDK initialized successfully')
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize Firebase Admin SDK')
    if (isProduction) {
      throw error
    }
  }
}

export function isFirebaseInitialized(): boolean {
  return firebaseInitialized
}

export { admin }
