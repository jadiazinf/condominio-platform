import { HttpError } from '@packages/http-client'

/**
 * Replaces {paramName} placeholders in a template with values from params.
 */
function interpolate(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    params[key] !== undefined ? String(params[key]) : match
  )
}

/**
 * Translates an API HttpError into a localized message.
 *
 * Resolution order:
 *  1. Specific key:  apiErrors.{CODE}.{resource}.{field}
 *  2. Resource key:   apiErrors.{CODE}.{resource}
 *  3. Generic key:    apiErrors.{CODE}
 *  4. Fallback:       apiErrors.unknown
 *
 * Supports {param} interpolation from error details.
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
  // { success: false, error: { code, message, details: { resource, field, ... } } }
  const nested = (err.details as Record<string, unknown>)?.error as
    | { details?: Record<string, unknown> }
    | undefined
  const details = nested?.details
  const resource = (details?.resource ?? details?.resourceType) as string | undefined
  const field = details?.field as string | undefined

  if (code) {
    // 1. Try specific: apiErrors.ALREADY_EXISTS.Condominium.email
    if (resource && field) {
      const specificKey = `apiErrors.${code}.${resource}.${field}`
      const specific = t(specificKey)
      if (specific !== specificKey) return details ? interpolate(specific, details) : specific
    }

    // 2. Try resource-only: apiErrors.NOT_FOUND.Condominium
    if (resource) {
      const resourceKey = `apiErrors.${code}.${resource}`
      const resourceTranslation = t(resourceKey)
      if (resourceTranslation !== resourceKey) return details ? interpolate(resourceTranslation, details) : resourceTranslation
    }

    // 3. Try generic code: apiErrors.ALREADY_EXISTS
    const genericKey = `apiErrors.${code}`
    const generic = t(genericKey)
    if (generic !== genericKey) return details ? interpolate(generic, details) : generic
  }

  // 4. Use the API message if available (already localized by the backend)
  if (err.message) {
    return err.message
  }

  // 5. Fallback
  return t('apiErrors.unknown')
}
