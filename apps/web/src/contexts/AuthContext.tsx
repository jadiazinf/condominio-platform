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

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, user => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)
      const auth = getFirebaseAuth()

      await signInWithEmailAndPassword(auth, email, password)
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

      await createUserWithEmailAndPassword(auth, email, password)
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
      await signInWithPopup(auth, provider)
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
    } catch (err) {
      const errorMessage = getFirebaseErrorMessage(err)

      setError(errorMessage)
      throw err
    }
  }, [])

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
      clearError,
    }),
    [user, loading, error, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut, clearError]
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

function getFirebaseErrorMessage(error: unknown): string {
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
