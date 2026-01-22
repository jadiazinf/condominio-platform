import type { TUser } from '@packages/domain'

const USER_COOKIE_NAME = '__user'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function getSecureFlag(): string {
  if (typeof window === 'undefined') return ''

  return window.location.protocol === 'https:' ? '; Secure' : ''
}

export function setUserCookie(user: TUser): void {
  const userJson = JSON.stringify(user)
  const encodedUser = encodeURIComponent(userJson)
  const cookieValue = `${USER_COOKIE_NAME}=${encodedUser}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${getSecureFlag()}`

  // Check cookie size (browsers typically limit to ~4KB)
  if (cookieValue.length > 4096) {
    console.warn('[UserCookie] Cookie size exceeds 4KB limit:', cookieValue.length, 'bytes')
  }

  document.cookie = cookieValue
}

export function getUserCookie(): TUser | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  const userCookie = cookies.find(cookie => cookie.trim().startsWith(`${USER_COOKIE_NAME}=`))

  if (!userCookie) {
    return null
  }

  try {
    const encodedValue = userCookie.split('=')[1]
    const decodedValue = decodeURIComponent(encodedValue)

    return JSON.parse(decodedValue) as TUser
  } catch {
    return null
  }
}

export function clearUserCookie(): void {
  document.cookie = `${USER_COOKIE_NAME}=; path=/; max-age=0${getSecureFlag()}`
}

export function getUserCookieName(): string {
  return USER_COOKIE_NAME
}
