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
 * Returns a fallback error message for internal use.
 * Components should use getFirebaseErrorKey with i18n for translated messages.
 */
export function getFirebaseErrorMessage(error: unknown): string {
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
