import type { TAppLanguages } from '@/locales'

const PENDING_REGISTRATION_KEY = 'pendingRegistration'

export interface IPendingRegistrationData {
  firstName: string
  lastName: string
  preferredLanguage: TAppLanguages
  acceptTerms: boolean
}

export function savePendingRegistration(data: IPendingRegistrationData): void {
  if (typeof window === 'undefined') return

  sessionStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(data))
}

export function getPendingRegistration(): IPendingRegistrationData | null {
  if (typeof window === 'undefined') return null

  const data = sessionStorage.getItem(PENDING_REGISTRATION_KEY)

  if (!data) return null

  try {
    return JSON.parse(data) as IPendingRegistrationData
  } catch {
    return null
  }
}

export function clearPendingRegistration(): void {
  if (typeof window === 'undefined') return

  sessionStorage.removeItem(PENDING_REGISTRATION_KEY)
}

export function hasPendingRegistration(): boolean {
  if (typeof window === 'undefined') return false

  return sessionStorage.getItem(PENDING_REGISTRATION_KEY) !== null
}
