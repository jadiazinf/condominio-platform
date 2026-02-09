import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { getMessaging, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let app: FirebaseApp
let auth: Auth
let storage: FirebaseStorage
let messaging: Messaging | null = null

function getFirebaseApp(): FirebaseApp {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApp()
  }

  return app
}

function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp())
  }

  return auth
}

function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp())
  }

  return storage
}

function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null
  if (!messaging) {
    messaging = getMessaging(getFirebaseApp())
  }

  return messaging
}

export { getFirebaseApp, getFirebaseAuth, getFirebaseStorage, getFirebaseMessaging }
