/**
 * Maps Firebase error codes to i18n translation keys
 */
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

/**
 * Maps HTTP API error codes to i18n translation keys.
 * Uses the `apiErrors` namespace from the i18n files.
 */
export function getApiErrorKey(error: { code?: string; details?: unknown }): string {
  if (!error.code) return 'apiErrors.unknown'

  // Try specific key first: apiErrors.CODE.Resource.Field
  const details = error.details as { resource?: string; field?: string } | undefined

  if (details?.resource && details?.field) {
    const specificKey = `apiErrors.${error.code}.${details.resource}.${details.field}`

    return specificKey
  }

  if (details?.resource) {
    const resourceKey = `apiErrors.${error.code}.${details.resource}`

    return resourceKey
  }

  return `apiErrors.${error.code}`
}
