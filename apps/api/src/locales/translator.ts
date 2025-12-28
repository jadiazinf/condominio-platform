import { z } from 'zod'
import { LocaleDictionary } from './dictionary'

export type TTranslateZodMessages = {
  payload: string | string[] | Record<string, string[]>
}

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
