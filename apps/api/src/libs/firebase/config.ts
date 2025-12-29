import admin from 'firebase-admin'
import logger from '@utils/logger'
import firebaseCredentialsKey from '@root/firebaseServiceAccountKey.json'

const initializeFirebase = () => {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseCredentialsKey as admin.ServiceAccount),
    })
    logger.info('Firebase Admin SDK initialized successfully')
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize Firebase Admin SDK')
  }
}

initializeFirebase()

export { admin }
