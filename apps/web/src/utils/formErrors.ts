/**
 * Utility functions for handling react-hook-form errors
 */

/**
 * Gets a nested error from react-hook-form errors object using dot notation
 * @example
 * const error = getNestedError(errors, 'admin.firstName')
 * const error = getNestedError(errors, 'phoneNumber')
 */
export function getNestedError(errors: any, fieldPath: string): any {
  if (!errors || !fieldPath) return undefined
  
  const parts = fieldPath.split('.')
  let error: any = errors
  
  for (const part of parts) {
    error = error?.[part]
    if (!error) return undefined
  }
  
  return error
}

/**
 * Gets the error message from a nested field
 * @example
 * const message = getErrorMessage(errors, 'admin.email')
 */
export function getErrorMessage(errors: any, fieldPath: string): string | undefined {
  const error = getNestedError(errors, fieldPath)
  return error?.message
}

/**
 * Checks if a field has an error
 * @example
 * const hasError = hasFieldError(errors, 'email')
 */
export function hasFieldError(errors: any, fieldPath: string): boolean {
  return !!getNestedError(errors, fieldPath)
}

/**
 * Gets translated error message
 * @example
 * const translated = getTranslatedError(errors, 'email', translateFn)
 */
export function getTranslatedError(
  errors: any,
  fieldPath: string,
  translateFn?: (message: string | undefined) => string | undefined
): string | undefined {
  const message = getErrorMessage(errors, fieldPath)
  return translateFn ? translateFn(message) : message
}
