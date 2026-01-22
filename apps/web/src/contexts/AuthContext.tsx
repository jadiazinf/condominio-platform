'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth'

import { getFirebaseAuth } from '@/libs/firebase'
import { clearUserCookie } from '@/libs/cookies'

const SESSION_COOKIE_NAME = '__session'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  deleteCurrentUser: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

async function setSessionCookie(user: User): Promise<void> {
  const idToken = await user.getIdToken()
  const isSecure = window.location.protocol === 'https:'
  const secureFlag = isSecure ? '; Secure' : ''

  document.cookie = `${SESSION_COOKIE_NAME}=${idToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secureFlag}`
}

function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift()
  }
  return undefined
}

async function waitForCookie(name: string, maxAttempts = 10, delayMs = 50): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (getCookie(name)) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  return false
}

function clearSessionCookie(): void {
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const secureFlag = isSecure ? '; Secure' : ''

  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax${secureFlag}`
  clearUserCookie()
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      setUser(firebaseUser)
      setLoading(false)

      if (firebaseUser) {
        await setSessionCookie(firebaseUser)
      } else {
        clearSessionCookie()
      }
    })

    return () => unsubscribe()
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)
      const auth = getFirebaseAuth()

      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      await setSessionCookie(userCredential.user)
      // Wait for cookie to be readable to avoid race condition with server-side validation
      await waitForCookie(SESSION_COOKIE_NAME)
    } catch (err) {
      const errorMessage = getFirebaseErrorMessage(err)

      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)
      const auth = getFirebaseAuth()

      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await setSessionCookie(userCredential.user)
    } catch (err) {
      const errorMessage = getFirebaseErrorMessage(err)

      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const auth = getFirebaseAuth()
      const provider = new GoogleAuthProvider()

      provider.setCustomParameters({
        prompt: 'select_account',
      })
      const userCredential = await signInWithPopup(auth, provider)
      await setSessionCookie(userCredential.user)
      // Wait for cookie to be readable to avoid race condition with server-side validation
      await waitForCookie(SESSION_COOKIE_NAME)
    } catch (err) {
      const errorMessage = getFirebaseErrorMessage(err)

      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      setError(null)
      const auth = getFirebaseAuth()

      await firebaseSignOut(auth)
      clearSessionCookie()
    } catch (err) {
      const errorMessage = getFirebaseErrorMessage(err)

      setError(errorMessage)
      throw err
    }
  }, [])

  const deleteCurrentUser = useCallback(async () => {
    try {
      setError(null)

      if (!user) {
        throw new Error('No user to delete')
      }

      await user.delete()
      clearSessionCookie()
    } catch (err) {
      const errorMessage = getFirebaseErrorMessage(err)

      setError(errorMessage)
      throw err
    }
  }, [user])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      deleteCurrentUser,
      clearError,
    }),
    [
      user,
      loading,
      error,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      deleteCurrentUser,
      clearError,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

// Maps Firebase error codes to i18n translation keys
export function getFirebaseErrorKey(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as { code: string }

    switch (firebaseError.code) {
      case 'auth/email-already-in-use':
        return 'auth.errors.emailInUse'
      case 'auth/invalid-email':
        return 'auth.errors.invalidCredentials'
      case 'auth/weak-password':
        return 'auth.errors.weakPassword'
      case 'auth/user-disabled':
        return 'auth.errors.userDisabled'
      case 'auth/user-not-found':
        return 'auth.errors.userNotFound'
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'auth.errors.invalidCredentials'
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'auth.errors.popupClosed'
      case 'auth/too-many-requests':
        return 'auth.errors.tooManyRequests'
      case 'auth/network-request-failed':
        return 'auth.errors.networkError'
      default:
        return 'auth.errors.generic'
    }
  }

  return 'auth.errors.generic'
}

function getFirebaseErrorMessage(error: unknown): string {
  // This function returns a fallback message for internal use
  // Components should use getFirebaseErrorKey with i18n for translated messages
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as { code: string }

    switch (firebaseError.code) {
      case 'auth/email-already-in-use':
        return 'Este email ya está registrado'
      case 'auth/invalid-email':
        return 'Email inválido'
      case 'auth/operation-not-allowed':
        return 'Operación no permitida'
      case 'auth/weak-password':
        return 'La contraseña es muy débil'
      case 'auth/user-disabled':
        return 'Esta cuenta ha sido deshabilitada'
      case 'auth/user-not-found':
        return 'Usuario no encontrado'
      case 'auth/wrong-password':
        return 'Contraseña incorrecta'
      case 'auth/invalid-credential':
        return 'Credenciales inválidas'
      case 'auth/popup-closed-by-user':
        return 'El inicio de sesión fue cancelado'
      case 'auth/cancelled-popup-request':
        return 'Se canceló la solicitud de inicio de sesión'
      case 'auth/popup-blocked':
        return 'El navegador bloqueó la ventana emergente. Por favor, habilita las ventanas emergentes'
      default:
        return 'Ha ocurrido un error. Por favor, intenta de nuevo'
    }
  }

  return 'Ha ocurrido un error inesperado'
}
