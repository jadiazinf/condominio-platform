import { HttpError } from '@packages/http-client'

/**
 * Translates an API HttpError into a localized message.
 *
 * Resolution order:
 *  1. Specific key:  apiErrors.{CODE}.{resource}.{field}
 *  2. Resource key:   apiErrors.{CODE}.{resource}
 *  3. Generic key:    apiErrors.{CODE}
 *  4. Fallback:       apiErrors.unknown
 */
export function translateApiError(
  err: unknown,
  t: (key: string) => string
): string {
  if (!HttpError.isHttpError(err)) {
    return t('apiErrors.unknown')
  }

  const code = err.code
  // The details field contains the full response body:
  // { success: false, error: { code, message, details: { resource, field } } }
  const nested = (err.details as Record<string, unknown>)?.error as
    | { details?: { resource?: string; field?: string } }
    | undefined
  const resource = nested?.details?.resource
  const field = nested?.details?.field

  if (code) {
    // 1. Try specific: apiErrors.ALREADY_EXISTS.Condominium.email
    if (resource && field) {
      const specificKey = `apiErrors.${code}.${resource}.${field}`
      const specific = t(specificKey)
      if (specific !== specificKey) return specific
    }

    // 2. Try resource-only: apiErrors.NOT_FOUND.Condominium
    if (resource) {
      const resourceKey = `apiErrors.${code}.${resource}`
      const resourceTranslation = t(resourceKey)
      if (resourceTranslation !== resourceKey) return resourceTranslation
    }

    // 3. Try generic code: apiErrors.ALREADY_EXISTS
    const genericKey = `apiErrors.${code}`
    const generic = t(genericKey)
    if (generic !== genericKey) return generic
  }

  // 4. Use the API message if available (already localized by the backend)
  if (err.message) {
    return err.message
  }

  // 5. Fallback
  return t('apiErrors.unknown')
}
