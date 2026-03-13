import { admin, initializeFirebaseAdmin, isFirebaseInitialized } from '@packages/services'
import { env } from '@worker/config/environment'
import path from 'path'

initializeFirebaseAdmin({
  nodeEnv: env.NODE_ENV,
  firebaseServiceAccountBase64: env.FIREBASE_SERVICE_ACCOUNT_BASE64,
  localCredentialsPath: path.resolve(import.meta.dir, '../../../firebaseServiceAccountKey.json'),
})

export { admin, isFirebaseInitialized }
