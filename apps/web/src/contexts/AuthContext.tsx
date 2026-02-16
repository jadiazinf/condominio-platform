'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import {
  type User,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth'

import { getFirebaseAuth, getFirebaseErrorMessage } from '@/libs/firebase'
import {
  setSessionCookie,
  waitForSessionCookie,
  clearSessionCookie,
  clearUserCookie,
} from '@/libs/cookies'
import { tokenRefreshManager } from '@/libs/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  signOutWithReason: (reason: 'inactivity' | 'manual') => Promise<void>
  deleteCurrentUser: () => Promise<void>
  verifyPassword: (password: string) => Promise<boolean>
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

  // Listen to token changes (including automatic Firebase refreshes)
  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onIdTokenChanged(auth, async firebaseUser => {
      if (firebaseUser) {
        // Token changed - update cookies
        await setSessionCookie(firebaseUser)
        console.log('[Auth] Token refreshed and saved to cookies')
      }
    })

    return () => unsubscribe()
  }, [])

  // Track last user activity for smart refresh
  const lastActivityRef = useRef<number>(Date.now())

  // Set up the refresh and logout functions for the token refresh manager
  useEffect(() => {
    const auth = getFirebaseAuth()

    // Refresh function: gets a fresh token from Firebase and saves to cookies
    const handleRefresh = async () => {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('No user available for token refresh')
      }

      console.log('[Auth] Refreshing token...')
      // Force refresh the token
      await currentUser.getIdToken(true)
      // Save to cookies (onIdTokenChanged will also trigger, but this ensures it happens)
      await setSessionCookie(currentUser, true)
      console.log('[Auth] Token refreshed successfully')
    }

    // Logout function: called when the refresh token expires (long inactivity)
    const handleLogout = async (reason: 'inactivity' | 'error') => {
      console.log('[Auth] Token refresh manager triggered logout:', reason)

      // Reset the manager first
      tokenRefreshManager.reset()

      // Clear cookies
      clearSessionCookie()
      clearUserCookie()

      // Sign out from Firebase
      try {
        await firebaseSignOut(auth)
      } catch {
        // Ignore errors during forced logout
      }

      // Redirect to signin with inactivity flag
      if (reason === 'inactivity') {
        window.location.href = '/auth?inactivity=true'
      } else {
        window.location.href = '/auth?error=session'
      }
    }

    tokenRefreshManager.setRefreshFunction(handleRefresh)
    tokenRefreshManager.setLogoutFunction(handleLogout)
  }, [])

  // Update activity timestamp on user interaction
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now()
    }

    // Track meaningful user activity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity)
      })
    }
  }, [])

  // Auto-refresh token proactively (before expiry)
  useEffect(() => {
    if (!user) return

    const REFRESH_INTERVAL = 45 * 60 * 1000 // 45 minutes (more aggressive)
    const EXPIRY_BUFFER = 15 * 60 * 1000 // 15 minutes buffer (more buffer)
    const ACTIVITY_THRESHOLD = 30 * 60 * 1000 // 30 minutes - only refresh if user was active

    const refreshToken = async () => {
      // Don't refresh if user has been inactive for too long
      const timeSinceActivity = Date.now() - lastActivityRef.current
      if (timeSinceActivity > ACTIVITY_THRESHOLD) {
        return
      }

      // Don't refresh if a refresh just happened (via the manager)
      if (tokenRefreshManager.getTimeSinceLastRefresh() < 60000) {
        return
      }

      try {
        // Use the token refresh manager to coordinate
        await tokenRefreshManager.refreshToken()
      } catch (err) {
        console.error('[Auth] Failed to refresh token:', err)
        // Don't clear session cookie here - let the server-side validation handle it
      }
    }

    // Check token expiry and refresh if needed
    const checkAndRefresh = async () => {
      try {
        const tokenResult = await user.getIdTokenResult()
        const expirationTime = new Date(tokenResult.expirationTime).getTime()
        const now = Date.now()
        const timeUntilExpiry = expirationTime - now

        // If token expires within buffer, refresh now
        if (timeUntilExpiry < EXPIRY_BUFFER) {
          await refreshToken()
        }
      } catch (err) {
        console.error('[Auth] Failed to check token expiry:', err)
      }
    }

    // Check immediately on mount
    checkAndRefresh()

    // Set up interval to refresh token
    const intervalId = setInterval(refreshToken, REFRESH_INTERVAL)

    // Also refresh when window regains focus (handles backgrounded tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Update activity since user is back
        lastActivityRef.current = Date.now()
        checkAndRefresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Refresh on route changes (navigation)
    const handleRouteChange = () => {
      lastActivityRef.current = Date.now()
      // Check token but don't force refresh on every navigation
      checkAndRefresh()
    }

    // Listen to popstate for back/forward navigation
    window.addEventListener('popstate', handleRouteChange)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [user])

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

      // Reset the token refresh manager
      tokenRefreshManager.reset()

      await firebaseSignOut(auth)
      clearSessionCookie()
      clearUserCookie()
    } catch (err) {
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw err
    }
  }, [])

  /**
   * Sign out with a specific reason (for automatic logouts)
   * This will redirect to signin with the appropriate message
   */
  const signOutWithReason = useCallback(async (reason: 'inactivity' | 'manual') => {
    try {
      setError(null)
      const auth = getFirebaseAuth()

      // Reset the token refresh manager
      tokenRefreshManager.reset()

      await firebaseSignOut(auth)
      clearSessionCookie()
      clearUserCookie()

      // Redirect with the reason
      if (reason === 'inactivity') {
        window.location.href = '/auth?inactivity=true'
      }
    } catch (err) {
      // Even if signout fails, still redirect for inactivity
      if (reason === 'inactivity') {
        clearSessionCookie()
        clearUserCookie()
        window.location.href = '/auth?inactivity=true'
      } else {
        const errorMessage = getFirebaseErrorMessage(err)
        setError(errorMessage)
        throw err
      }
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

  /**
   * Verify the current user's password using Firebase reauthentication.
   * Useful for sensitive operations that require password confirmation.
   */
  const verifyPassword = useCallback(async (password: string): Promise<boolean> => {
    try {
      setError(null)

      if (!user || !user.email) {
        throw new Error('No user available for password verification')
      }

      const credential = EmailAuthProvider.credential(user.email, password)
      await reauthenticateWithCredential(user, credential)
      return true
    } catch (err) {
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      return false
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
      signOutWithReason,
      deleteCurrentUser,
      verifyPassword,
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
      signOutWithReason,
      deleteCurrentUser,
      verifyPassword,
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
