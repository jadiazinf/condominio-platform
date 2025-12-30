import { z } from 'zod'
import { LocaleDictionary } from './dictionary'
import type { TFieldError, TValidationErrorResponse } from '@http/responses/types'
import { ErrorCodes } from '@http/responses/types'

export type TTranslateZodMessages = {
  payload: string | string[] | Record<string, string[]>
}

/**
 * @deprecated Use translateZodToValidationError instead for standardized error responses
 */
export function translateZodMessages<T>(
  errorTree: z.ZodError<T> | z.core.$ZodErrorTree<z.output<T>, string>,
  t: (key: string) => string
): TTranslateZodMessages {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalize = (tree: any): string | string[] | Record<string, string[]> => {
    if ('errors' in tree && Array.isArray(tree.errors) && tree.errors.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const translated = tree.errors.map((e: any) =>
        typeof e === 'string' ? t(e) : t(e?.message ?? String(e))
      )
      return translated.length === 1 ? translated[0] : translated
    }

    if ('properties' in tree && tree.properties) {
      const result: Record<string, string[]> = {}

      for (const [key, value] of Object.entries(tree.properties)) {
        const nested = normalize(value)
        if (typeof nested === 'string') {
          result[key] = [nested]
        } else if (Array.isArray(nested)) {
          result[key] = nested
        } else {
          // nested is Record<string, string[]>, flattening not needed here
          result[key] = ['Invalid nested structure']
        }
      }

      return result
    }

    if ('items' in tree && tree.items) {
      const result: Record<string, string[]> = {}

      for (const [index, value] of Object.entries(tree.items)) {
        const nested = normalize(value)
        if (typeof nested === 'string') {
          result[index] = [nested]
        } else if (Array.isArray(nested)) {
          result[index] = nested
        } else {
          result[index] = ['Invalid nested structure']
        }
      }

      return result
    }

    return t(LocaleDictionary.http.locales.unknownError)
  }

  return { payload: normalize(errorTree) }
}

/**
 * Translates a Zod 4 error into a standardized validation error response
 * @param zodError - The Zod error from safeParse
 * @param t - Translation function
 * @returns Standardized validation error response with field-level errors
 */
export function translateZodToValidationError<T>(
  zodError: z.ZodError<T>,
  t: (key: string) => string
): TValidationErrorResponse {
  const fieldMap = new Map<string, string[]>()

  for (const issue of zodError.issues) {
    const fieldPath = issue.path.length > 0 ? issue.path.join('.') : '_root'
    const translatedMessage = t(issue.message)

    if (fieldMap.has(fieldPath)) {
      fieldMap.get(fieldPath)!.push(translatedMessage)
    } else {
      fieldMap.set(fieldPath, [translatedMessage])
    }
  }

  const fields: TFieldError[] = Array.from(fieldMap.entries()).map(([field, messages]) => ({
    field,
    messages,
  }))

  return {
    success: false,
    error: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: t(LocaleDictionary.http.locales.validationError),
      fields,
    },
  }
}
