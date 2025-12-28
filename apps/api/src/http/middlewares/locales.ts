import { Hono } from 'hono'
import { defineI18nMiddleware, detectLocaleFromAcceptLanguageHeader } from '@intlify/hono'
import { EAppLanguages } from '@locales/types'
import en from '@locales/en.json'
import es from '@locales/es.json'

const i18nMiddleware = defineI18nMiddleware({
  locale: detectLocaleFromAcceptLanguageHeader,
  fallbackLocale: EAppLanguages.ES,
  messages: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    en: en as unknown as Record<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    es: es as unknown as Record<string, any>,
  },
})

export function applyI18nMiddleware(app: Hono) {
  app.use('*', i18nMiddleware)
}
