import { Hono } from 'hono'
import { defineI18nMiddleware, detectLocaleFromAcceptLanguageHeader } from '@intlify/hono'
import { EAppLanguages } from '@locales/types'
import appEn from '@locales/en.json'
import appEs from '@locales/es.json'
import { domainLocalesEn, domainLocalesEs } from '@packages/domain'

function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
  const result = { ...target } as Record<string, unknown>

  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>)
    } else {
      result[key] = source[key]
    }
  }

  return result as T
}

const i18nMiddleware = defineI18nMiddleware({
  locale: detectLocaleFromAcceptLanguageHeader,
  fallbackLocale: EAppLanguages.ES,
  messages: {
    en: deepMerge(domainLocalesEn, appEn),
    es: deepMerge(domainLocalesEs, appEs),
  },
})

export function applyI18nMiddleware(app: Hono) {
  app.use('*', i18nMiddleware)
}
