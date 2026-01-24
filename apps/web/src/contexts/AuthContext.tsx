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

import { getFirebaseAuth, getFirebaseErrorMessage } from '@/libs/firebase'
import {
  setSessionCookie,
  waitForSessionCookie,
  clearSessionCookie,
} from '@/libs/cookies'

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
      await waitForSessionCookie()
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
      await waitForSessionCookie()
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
