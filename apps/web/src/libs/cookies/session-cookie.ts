import type { User } from 'firebase/auth'
import { clearUserCookie } from './user-cookie'

const SESSION_COOKIE_NAME = '__session'
// TEMPORARILY set back to 7 days while debugging
const TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7 // 7 days

export async function setSessionCookie(user: User, forceRefresh = false): Promise<void> {
  // Force refresh gets a new token, otherwise uses cached token if valid
  const idToken = await user.getIdToken(forceRefresh)
  const isSecure = window.location.protocol === 'https:'
  const secureFlag = isSecure ? '; Secure' : ''

  document.cookie = `${SESSION_COOKIE_NAME}=${idToken}; path=/; max-age=${TOKEN_EXPIRY_SECONDS}; SameSite=Lax${secureFlag}`
}

export function getSessionCookie(): string | undefined {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${SESSION_COOKIE_NAME}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift()
  }
  return undefined
}

export async function waitForSessionCookie(maxAttempts = 10, delayMs = 50): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (getSessionCookie()) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  return false
}

export function clearSessionCookie(): void {
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const secureFlag = isSecure ? '; Secure' : ''

  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax${secureFlag}`
  clearUserCookie()
}
