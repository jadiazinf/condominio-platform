import admin from 'firebase-admin'
import { env } from '@config/environment'
import logger from '@utils/logger'

const initializeFirebase = () => {
  // Firebase credentials should be provided via environment variable
  const credentialsJson = env.FIREBASE_SERVICE_ACCOUNT

  if (!credentialsJson) {
    logger.warn(
      'FIREBASE_SERVICE_ACCOUNT environment variable is not set. Firebase authentication will not work.'
    )
    return
  }

  try {
    const serviceAccount = JSON.parse(credentialsJson)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    })
    logger.info('Firebase Admin SDK initialized successfully')
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize Firebase Admin SDK')
  }
}

initializeFirebase()

export { admin }
