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

const LOCALE_COOKIE = 'NEXT_LOCALE'

type TMessages = Record<string, unknown>

function deepMerge<T extends TMessages>(target: T, source: TMessages): T {
  const result = { ...target } as TMessages

  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key] as TMessages, source[key] as TMessages)
    } else {
      result[key] = source[key]
    }
  }

  return result as T
}

function getNestedValue(obj: TMessages, path: string): string | undefined {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as TMessages)[key]
  }

  return typeof current === 'string' ? current : undefined
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)

  if (parts.length === 2) {
    return parts.pop()?.split(';').shift()
  }

  return undefined
}

function setCookie(name: string, value: string, days: number = 365): void {
  if (typeof document === 'undefined') return
  const expires = new Date()

  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

const allMessages: Record<TAppLanguages, TMessages> = {
  [EAppLanguages.ES]: deepMerge(domainLocalesEs as TMessages, appLocalesEs as TMessages),
  [EAppLanguages.EN]: deepMerge(domainLocalesEn as TMessages, appLocalesEn as TMessages),
}

interface II18nContextValue {
  locale: TAppLanguages
  setLocale: (locale: TAppLanguages) => void
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

    const cookieLocale = getCookie(LOCALE_COOKIE)

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

  const setLocale = useCallback((newLocale: TAppLanguages) => {
    setLocaleState(newLocale)
    if (typeof window !== 'undefined') {
      setCookie(LOCALE_COOKIE, newLocale)
      document.documentElement.lang = newLocale
    }
  }, [])

  // Configure domain i18n adapter
  useEffect(() => {
    const adapter = createTranslateFunction(t)

    setI18nAdapter(adapter)
  }, [t])

  // Configure http-client locale for Accept-Language header
  useEffect(() => {
    setGlobalLocale(() => locale)
  }, [locale])

  // Set initial html lang attribute
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
