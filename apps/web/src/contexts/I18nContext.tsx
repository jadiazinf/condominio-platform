'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { IntlMessageFormat } from 'intl-messageformat'
import {
  setI18nAdapter,
  createTranslateFunction,
  domainLocalesEs,
  domainLocalesEn,
} from '@packages/domain'
import { setGlobalLocale } from '@packages/http-client'

import {
  appLocalesEs,
  appLocalesEn,
  EAppLanguages,
  DEFAULT_LANGUAGE,
  type TAppLanguages,
} from '@/locales'
import {
  deepMerge,
  getNestedValue,
  getLocaleCookie,
  setLocaleCookie,
} from '@/libs/i18n/utils'

type TMessages = Record<string, unknown>

const allMessages: Record<TAppLanguages, TMessages> = {
  [EAppLanguages.ES]: deepMerge(domainLocalesEs as TMessages, appLocalesEs as TMessages),
  [EAppLanguages.EN]: deepMerge(domainLocalesEn as TMessages, appLocalesEn as TMessages),
}

interface II18nContextValue {
  locale: TAppLanguages
  setLocale: (locale: TAppLanguages, refresh?: boolean) => void
  t: (key: string, values?: Record<string, string | number>) => string
}

const I18nContext = createContext<II18nContextValue | null>(null)

interface II18nProviderProps {
  children: ReactNode
  initialLocale?: TAppLanguages
}

export function I18nProvider({ children, initialLocale }: II18nProviderProps) {
  const [locale, setLocaleState] = useState<TAppLanguages>(() => {
    if (initialLocale) return initialLocale
    if (typeof window === 'undefined') return DEFAULT_LANGUAGE

    const cookieLocale = getLocaleCookie()

    if (cookieLocale && (cookieLocale === EAppLanguages.ES || cookieLocale === EAppLanguages.EN)) {
      return cookieLocale as TAppLanguages
    }

    return DEFAULT_LANGUAGE
  })

  const messages = useMemo(() => allMessages[locale], [locale])

  const t = useCallback(
    (key: string, values?: Record<string, string | number>): string => {
      const message = getNestedValue(messages, key)

      if (!message) {
        console.warn(`[i18n] Missing translation for key: ${key}`)
        return key
      }

      if (values) {
        try {
          const formatter = new IntlMessageFormat(message, locale)
          return formatter.format(values) as string
        } catch (error) {
          console.warn(`[i18n] Error formatting message for key: ${key}`, error)
          return message
        }
      }

      return message
    },
    [messages, locale]
  )

  const setLocale = useCallback((newLocale: TAppLanguages, refresh: boolean = true) => {
    if (typeof window !== 'undefined') {
      setLocaleCookie(newLocale)

      if (refresh) {
        window.location.reload()
        return
      }

      document.documentElement.lang = newLocale
    }
    setLocaleState(newLocale)
  }, [])

  useEffect(() => {
    const adapter = createTranslateFunction(t)
    setI18nAdapter(adapter)
  }, [t])

  useEffect(() => {
    setGlobalLocale(() => locale)
  }, [locale])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): II18nContextValue {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }

  return context
}

export function useTranslation() {
  const { t, locale } = useI18n()
  return { t, locale }
}
