import type { User } from 'firebase/auth'
import { clearUserCookie } from './user-cookie'

const SESSION_COOKIE_NAME = '__session'

export async function setSessionCookie(user: User): Promise<void> {
  const idToken = await user.getIdToken()
  const isSecure = window.location.protocol === 'https:'
  const secureFlag = isSecure ? '; Secure' : ''

  document.cookie = `${SESSION_COOKIE_NAME}=${idToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secureFlag}`
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
